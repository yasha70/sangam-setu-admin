import "server-only";
import { Redis } from "@upstash/redis";
import fs from "node:fs";
import path from "node:path";

/**
 * The small set of Redis operations the app uses. Production uses Upstash Redis
 * (connected through the Vercel Marketplace, which sets KV_REST_API_URL and
 * KV_REST_API_TOKEN). Local development without those variables uses an in-memory
 * store that is saved to .data/dev-db.json.
 */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean; ex?: number }): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  mget(keys: string[]): Promise<(string | null)[]>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  sadd(key: string, member: string): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
  sismember(key: string, member: string): Promise<boolean>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrem(key: string, member: string): Promise<void>;
  zscore(key: string, member: string): Promise<number | null>;
  /** Members from highest score to lowest. */
  zrevrange(key: string, start: number, stop: number): Promise<string[]>;
  /** Members with score strictly greater than `after`, lowest first. */
  zafter(key: string, after: number, limit?: number): Promise<string[]>;
  /** The last `count` members by score, lowest first. */
  zlast(key: string, count: number): Promise<string[]>;
  zcard(key: string): Promise<number>;
}

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function isDatabaseConfigured() {
  return redisEnv() !== null || process.env.NODE_ENV !== "production" || process.env.SANGAM_MEMORY_DB === "1";
}

class UpstashKV implements KV {
  private r: Redis;
  constructor(url: string, token: string) {
    this.r = new Redis({ url, token, automaticDeserialization: false });
  }
  async get(key: string) {
    return (await this.r.get<string>(key)) ?? null;
  }
  async set(key: string, value: string, opts?: { nx?: boolean; ex?: number }) {
    const res = opts?.nx
      ? opts.ex
        ? await this.r.set(key, value, { nx: true, ex: opts.ex })
        : await this.r.set(key, value, { nx: true })
      : opts?.ex
        ? await this.r.set(key, value, { ex: opts.ex })
        : await this.r.set(key, value);
    return res === "OK";
  }
  async del(...keys: string[]) {
    if (keys.length) await this.r.del(...keys);
  }
  async mget(keys: string[]) {
    if (!keys.length) return [];
    return (await this.r.mget<(string | null)[]>(...keys)) ?? [];
  }
  async incr(key: string, ttlSeconds?: number) {
    const n = await this.r.incr(key);
    if (ttlSeconds && n === 1) await this.r.expire(key, ttlSeconds);
    return n;
  }
  async sadd(key: string, member: string) {
    await this.r.sadd(key, member);
  }
  async srem(key: string, member: string) {
    await this.r.srem(key, member);
  }
  async smembers(key: string) {
    return ((await this.r.smembers(key)) as string[]) ?? [];
  }
  async sismember(key: string, member: string) {
    return (await this.r.sismember(key, member)) === 1;
  }
  async zadd(key: string, score: number, member: string) {
    await this.r.zadd(key, { score, member });
  }
  async zrem(key: string, member: string) {
    await this.r.zrem(key, member);
  }
  async zscore(key: string, member: string) {
    const s = await this.r.zscore(key, member);
    return s === null || s === undefined ? null : Number(s);
  }
  async zrevrange(key: string, start: number, stop: number) {
    return (await this.r.zrange<string[]>(key, start, stop, { rev: true })) ?? [];
  }
  async zafter(key: string, after: number, limit = 200) {
    return (
      (await this.r.zrange<string[]>(key, `(${after}`, "+inf", { byScore: true, offset: 0, count: limit })) ?? []
    );
  }
  async zlast(key: string, count: number) {
    const rev = (await this.r.zrange<string[]>(key, 0, count - 1, { rev: true })) ?? [];
    return rev.reverse();
  }
  async zcard(key: string) {
    return await this.r.zcard(key);
  }
}

type MemData = {
  str: Record<string, { v: string; exp?: number }>;
  set: Record<string, string[]>;
  zset: Record<string, Record<string, number>>;
};

class MemoryKV implements KV {
  private d: MemData;
  private file = path.join(process.cwd(), ".data", "dev-db.json");
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    try {
      this.d = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      this.d = { str: {}, set: {}, zset: {} };
    }
  }
  private save() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify(this.d));
      } catch {
        // Saving is only a convenience for local development.
      }
    }, 200);
  }
  private live(key: string) {
    const e = this.d.str[key];
    if (e && e.exp && e.exp < Date.now()) {
      delete this.d.str[key];
      return undefined;
    }
    return e;
  }
  private sorted(key: string) {
    return Object.entries(this.d.zset[key] ?? {}).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  }
  async get(key: string) {
    return this.live(key)?.v ?? null;
  }
  async set(key: string, value: string, opts?: { nx?: boolean; ex?: number }) {
    if (opts?.nx && this.live(key)) return false;
    this.d.str[key] = { v: value, exp: opts?.ex ? Date.now() + opts.ex * 1000 : undefined };
    this.save();
    return true;
  }
  async del(...keys: string[]) {
    for (const k of keys) {
      delete this.d.str[k];
      delete this.d.set[k];
      delete this.d.zset[k];
    }
    this.save();
  }
  async mget(keys: string[]) {
    return keys.map((k) => this.live(k)?.v ?? null);
  }
  async incr(key: string, ttlSeconds?: number) {
    const cur = Number(this.live(key)?.v ?? 0) + 1;
    const exp = this.live(key)?.exp ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined);
    this.d.str[key] = { v: String(cur), exp };
    this.save();
    return cur;
  }
  async sadd(key: string, member: string) {
    const s = new Set(this.d.set[key] ?? []);
    s.add(member);
    this.d.set[key] = [...s];
    this.save();
  }
  async srem(key: string, member: string) {
    this.d.set[key] = (this.d.set[key] ?? []).filter((m) => m !== member);
    this.save();
  }
  async smembers(key: string) {
    return [...(this.d.set[key] ?? [])];
  }
  async sismember(key: string, member: string) {
    return (this.d.set[key] ?? []).includes(member);
  }
  async zadd(key: string, score: number, member: string) {
    (this.d.zset[key] ??= {})[member] = score;
    this.save();
  }
  async zrem(key: string, member: string) {
    if (this.d.zset[key]) delete this.d.zset[key][member];
    this.save();
  }
  async zscore(key: string, member: string) {
    return this.d.zset[key]?.[member] ?? null;
  }
  async zrevrange(key: string, start: number, stop: number) {
    const all = this.sorted(key).reverse().map((e) => e[0]);
    return all.slice(start, stop < 0 ? undefined : stop + 1);
  }
  async zafter(key: string, after: number, limit = 200) {
    return this.sorted(key)
      .filter((e) => e[1] > after)
      .slice(0, limit)
      .map((e) => e[0]);
  }
  async zlast(key: string, count: number) {
    return this.sorted(key)
      .slice(-count)
      .map((e) => e[0]);
  }
  async zcard(key: string) {
    return Object.keys(this.d.zset[key] ?? {}).length;
  }
}

const g = globalThis as unknown as { __sangamKV?: KV };

export function kv(): KV {
  if (g.__sangamKV) return g.__sangamKV;
  const env = redisEnv();
  if (env) {
    g.__sangamKV = new UpstashKV(env.url, env.token);
  } else if (process.env.NODE_ENV !== "production" || process.env.SANGAM_MEMORY_DB === "1") {
    g.__sangamKV = new MemoryKV();
  } else {
    throw new DatabaseNotConfiguredError();
  }
  return g.__sangamKV;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("The database is not connected. Add Upstash Redis to this Vercel project.");
  }
}

export function sessionSecretMaterial(): string {
  const env = redisEnv();
  return process.env.SESSION_SECRET || (env ? `derived:${env.token}` : "sangam-setu-local-development-only");
}
