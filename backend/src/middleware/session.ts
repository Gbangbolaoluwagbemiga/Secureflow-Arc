import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WHO IS CALLING, PROVEN ONCE.
 *
 * The API's only gate was a bearer token compiled into the frontend bundle, so
 * "authenticated" meant "opened DevTools". Routes then took the caller's
 * identity from the request body: POST /v1/messages trusted `sender_address`,
 * POST /v1/notifications trusted `wallet_address`. Anybody could speak as
 * anybody.
 *
 * `upload` and `disputes` already do this properly — sign a message with the
 * wallet you claim to be, and the server checks it. The reason that pattern was
 * never extended is that it does not survive being applied per request:
 * uploading is something a person deliberately does once, while notifications
 * poll. A wallet prompt per poll is unusable, and worse than unusable, because
 * people learn to approve prompts without reading them.
 *
 * So the signature happens once and buys a short-lived token. After that every
 * route can ask `req.wallet` and get an answer nothing in the request body can
 * influence.
 *
 * STATELESS ON PURPOSE. This backend has a vercel.json and may run serverless,
 * where one invocation cannot see another's memory. A nonce table would need
 * storage and a cleanup story; an HMAC over {wallet, expiry} needs neither and
 * cannot be forged without SESSION_SECRET, which never leaves the server.
 */

/** An hour. Long enough to work through a job, short enough that a leaked token ages out. */
export const SESSION_TTL_MS = 60 * 60 * 1000;

/** How stale a signed login message may be. Same window `upload` uses. */
export const SESSION_AUTH_MAX_AGE_MS = 5 * 60 * 1000;

function secret(): string | undefined {
  const s = process.env.SESSION_SECRET?.trim();
  return s && s.length > 0 ? s : undefined;
}

/**
 * Whether sessions can be issued at all.
 *
 * Deliberately NOT falling back to API_SECRET: that value ships in the
 * frontend bundle, so signing tokens with it would let anyone mint a session
 * for any wallet — the exact hole this replaces, wearing a different hat.
 */
export function isSessionConfigured(): boolean {
  return secret() !== undefined;
}

/** The message a wallet signs to start a session. */
export function buildSessionAuthMessage(wallet: string, timestamp: string): string {
  return [
    "SecureFlow session authorization",
    `Wallet: ${wallet.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    "",
    "Signing this proves you control this wallet. It does not approve any transaction and moves no funds.",
  ].join("\n");
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** `<base64url payload>.<hmac>`, carrying the wallet and an expiry. */
export function issueSessionToken(wallet: string, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET is not set");
  const payload = Buffer.from(
    JSON.stringify({ w: wallet.toLowerCase(), e: now + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/**
 * The wallet this token proves, or null.
 *
 * Null covers every failure — malformed, wrong signature, expired, sessions
 * not configured — because a caller learns nothing useful from being told
 * which, and the caller that matters already knows.
 */
export function walletFromSessionToken(token: string, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;

  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);

  const expected = sign(payload, key);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { w, e } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof w !== "string" || typeof e !== "number") return null;
    if (now >= e) return null;
    return w.toLowerCase();
  } catch {
    return null;
  }
}
