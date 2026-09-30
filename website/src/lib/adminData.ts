import "server-only";
import { getBiodatas, getUsers, listUserIds } from "./data";
import type { Biodata, User } from "./types";

export type Member = { user: User; bio: Biodata | null };

/** Every real member (sample profiles aren't members), newest first. */
export async function loadMembers(): Promise<Member[]> {
  const ids = await listUserIds();
  const [users, bios] = await Promise.all([getUsers(ids), getBiodatas(ids)]);
  return ids
    .map((_, i) => ({ user: users[i], bio: bios[i] }))
    .filter((m): m is Member => Boolean(m.user) && !m.bio?.sample);
}

export function fmtDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
