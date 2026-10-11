import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { kv } from "./kv";
import { hashPassword } from "./auth";
import { createUser, deleteAccount, findUserIdByPhone, getBiodata, getUser, getUsers, listUserIds, saveBiodata, saveUser, unblockUser } from "./data";
import type { Interest } from "./types";

/*
 Temporary testing tools, only reachable from the admin panel (Admin → Testing).

 - A pair of test accounts that are already connected, so chat and calls work straight away.
 - One-tap login links for each, to open on two phones or browsers.
 - Connect any two existing accounts without the interest step.

 Keys
   testpair            JSON { a, b, password, created } for the current pair
   testlogin:{token}   user id for a login link (expires after 7 days)

 Delete the pair from the admin page when testing is done.
*/

export type TestAccount = { id: string; name: string; phone: string; token: string };
export type TestPair = { a: TestAccount; b: TestAccount; password: string; created: number };

const LINK_DAYS = 7;

export async function getTestPair() {
  const raw = await kv().get("testpair");
  return raw ? (JSON.parse(raw) as TestPair) : null;
}

/** Connects two accounts as if one had accepted the other's interest. */
export async function forceConnect(a: string, b: string) {
  if (a === b) return false;
  const now = Date.now();
  const interest: Interest = { from: a, to: b, status: "accepted", createdAt: now, updatedAt: now };
  await Promise.all([unblockUser(a, b), unblockUser(b, a)]);
  await kv().set(`int:${a}:${b}`, JSON.stringify(interest));
  await kv().del(`int:${b}:${a}`);
  await Promise.all([kv().zadd(`conn:${a}`, now, b), kv().zadd(`conn:${b}`, now, a), kv().zadd(`out:${a}`, now, b), kv().zadd(`in:${b}`, now, a)]);
  return true;
}

async function loginToken(uid: string) {
  const token = randomBytes(18).toString("base64url");
  await kv().set(`testlogin:${token}`, uid, { ex: LINK_DAYS * 86400 });
  return token;
}

async function freePhone() {
  for (let i = 0; i < 20; i++) {
    const phone = `60000${String(randomInt(0, 100000)).padStart(5, "0")}`;
    if (!(await findUserIdByPhone(phone))) return phone;
  }
  throw new Error("Couldn't find a free test number.");
}

export async function createTestPair(): Promise<TestPair> {
  const existing = await getTestPair();
  if (existing) return existing;
  const password = randomBytes(6).toString("base64url").replace(/[-_]/g, "x");
  const passHash = await hashPassword(password);
  const make = async (name: string, gender: "male" | "female", city: string) => {
    const user = await createUser({ name, phone: await freePhone(), gender, createdFor: "Myself", passHash });
    if (!user) throw new Error("Couldn't create a test account.");
    await saveUser({ ...user, test: true });
    // Unpublished, so real members never see test accounts in Browse.
    await saveBiodata(user.id, { city, state: "Madhya Pradesh", dob: gender === "male" ? "1996-05-10" : "1999-02-20", occupation: "Tester", about: "Temporary test account." });
    return { id: user.id, name, phone: user.phone, token: await loginToken(user.id) };
  };
  const a = await make("Test Groom", "male", "Indore");
  const b = await make("Test Bride", "female", "Bhopal");
  await forceConnect(a.id, b.id);
  const pair: TestPair = { a, b, password, created: Date.now() };
  await kv().set("testpair", JSON.stringify(pair));
  return pair;
}

/** Fresh login links, for when the old ones expired. */
export async function refreshLinks() {
  const pair = await getTestPair();
  if (!pair) return null;
  pair.a.token = await loginToken(pair.a.id);
  pair.b.token = await loginToken(pair.b.id);
  await kv().set("testpair", JSON.stringify(pair));
  return pair;
}

export async function deleteTestPair() {
  const pair = await getTestPair();
  if (!pair) return;
  await deleteAccount(pair.a.id);
  await deleteAccount(pair.b.id);
  await kv().del("testpair", `testlogin:${pair.a.token}`, `testlogin:${pair.b.token}`);
}

/** The test account a login link opens, if it's still valid. */
export async function testLoginUser(token: string) {
  if (!/^[\w-]{20,40}$/.test(token)) return null;
  const uid = await kv().get(`testlogin:${token}`);
  const user = uid ? await getUser(uid) : null;
  return user?.test ? user : null;
}

/** Finds a member by mobile number or profile ID (SS1001). */
export async function findMember(input: string) {
  const t = input.trim().toUpperCase();
  const ss = t.match(/^SS?(\d{4,})$/);
  if (ss) {
    const ids = await listUserIds();
    const users = await getUsers(ids);
    return users.find((u) => u?.profileNo === Number(ss[1])) ?? null;
  }
  const digits = t.replace(/\D/g, "").slice(-10);
  const id = digits.length === 10 ? await findUserIdByPhone(digits) : null;
  return id ? await getUser(id) : null;
}

export async function connectMembers(x: string, y: string) {
  const [a, b] = await Promise.all([findMember(x), findMember(y)]);
  if (!a || !b) return { error: `Couldn't find ${!a ? x : y}. Use a 10-digit mobile number or a profile ID like SS1001.` };
  if (a.id === b.id) return { error: "Choose two different accounts." };
  await forceConnect(a.id, b.id);
  const [ba, bb] = await Promise.all([getBiodata(a.id), getBiodata(b.id)]);
  return { message: `${ba?.fullName ?? a.name} and ${bb?.fullName ?? b.name} are now connected. Log in as either and open Chats.` };
}
