import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildSessionAuthMessage,
  issueSessionToken,
  walletFromSessionToken,
  SESSION_TTL_MS,
} from "../../src/middleware/session.js";

/**
 * PROVING WHO IS CALLING, ONCE.
 *
 * The API's only gate was a bearer token compiled into the frontend bundle, so
 * every route that read an identity out of the request body — messages taking
 * `sender_address`, notifications taking `wallet_address` — would believe
 * anybody who had opened DevTools.
 *
 * These cover the half that can ship without touching the frontend: a wallet
 * can exchange one signature for a session, the old secret still works so
 * nobody is logged out mid-migration, and a token cannot be forged.
 */

const KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const;
const account = privateKeyToAccount(KEY);
const WALLET = account.address;
const SECRET = "legacy-shared-secret";
const SESSION_SECRET = "server-only-signing-key";

async function appWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import("../../src/index.js")).default;
}

const base = {
  API_SECRET: SECRET,
  SESSION_SECRET,
  FRONTEND_URL: "https://secureflow.work",
};

async function signIn(app: unknown, at = Date.now()) {
  const timestamp = String(at);
  const signature = await account.signMessage({
    message: buildSessionAuthMessage(WALLET, timestamp),
  });
  return request(app as never)
    .post("/v1/auth/session")
    .send({ wallet: WALLET, timestamp, signature });
}

const saved = { ...process.env };
beforeEach(() => { process.env.VERCEL = "1"; });
afterEach(() => { process.env = { ...saved }; });

describe("exchanging a signature for a session", () => {
  it("issues a token to a wallet that can sign for itself", async () => {
    const app = await appWith(base);
    const res = await signIn(app);

    expect(res.status).toBe(200);
    expect(res.body.wallet).toBe(WALLET.toLowerCase());
    expect(res.body.expiresInMs).toBe(SESSION_TTL_MS);
    expect(typeof res.body.token).toBe("string");
  });

  it("refuses a signature from a different wallet", async () => {
    const app = await appWith(base);
    const timestamp = String(Date.now());
    const signature = await account.signMessage({
      message: buildSessionAuthMessage(WALLET, timestamp),
    });
    const someoneElse = "0x1111111111111111111111111111111111111111";

    const res = await request(app)
      .post("/v1/auth/session")
      .send({ wallet: someoneElse, timestamp, signature });

    expect(res.status).toBe(401);
  });

  it("refuses a signature that is too old to be a fresh sign-in", async () => {
    const app = await appWith(base);
    const res = await signIn(app, Date.now() - 10 * 60 * 1000);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  /* Signing in cannot sit behind the gate it opens. */
  it("is reachable without the legacy secret", async () => {
    const app = await appWith(base);
    const res = await signIn(app); // no Authorization header at all
    expect(res.status).toBe(200);
  });

  /* A server that cannot sign tokens must not hand back something that looks
     like a session and authorises nothing. */
  it("refuses to issue sessions when SESSION_SECRET is unset", async () => {
    const app = await appWith({ ...base, SESSION_SECRET: undefined });
    const res = await signIn(app);
    expect(res.status).toBe(503);
  });
});

describe("what a session token gets you", () => {
  it("opens the gated routes without the shared secret", async () => {
    const app = await appWith(base);
    const { body } = await signIn(app);

    const res = await request(app)
      .get(`/v1/notifications?wallet=${WALLET}`)
      .set("Authorization", `Bearer ${body.token}`);

    expect(res.status).not.toBe(401);
  });

  it("still lets yesterday's bundle in on the shared secret", async () => {
    const app = await appWith(base);
    const res = await request(app)
      .get(`/v1/notifications?wallet=${WALLET}`)
      .set("Authorization", `Bearer ${SECRET}`);

    expect(res.status).not.toBe(401);
  });

  it("refuses a token that is neither", async () => {
    const app = await appWith(base);
    const res = await request(app)
      .get(`/v1/notifications?wallet=${WALLET}`)
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
  });
});

describe("the token itself", () => {
  beforeEach(() => { process.env.SESSION_SECRET = SESSION_SECRET; });

  it("round-trips the wallet", () => {
    const t = issueSessionToken(WALLET);
    expect(walletFromSessionToken(t)).toBe(WALLET.toLowerCase());
  });

  it("rejects a tampered payload", () => {
    const t = issueSessionToken(WALLET);
    const forged = Buffer.from(
      JSON.stringify({ w: "0x1111111111111111111111111111111111111111", e: Date.now() + 1e6 }),
    ).toString("base64url");
    expect(walletFromSessionToken(`${forged}.${t.split(".")[1]}`)).toBeNull();
  });

  it("expires", () => {
    const t = issueSessionToken(WALLET);
    expect(walletFromSessionToken(t, Date.now() + SESSION_TTL_MS + 1)).toBeNull();
  });

  /* The signing key must never be the one that ships to browsers. */
  it("cannot be verified with a different signing key", () => {
    const t = issueSessionToken(WALLET);
    process.env.SESSION_SECRET = "some-other-key";
    expect(walletFromSessionToken(t)).toBeNull();
  });
});
