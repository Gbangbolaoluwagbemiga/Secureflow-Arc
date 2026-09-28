import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

/**
 * WHAT THE RELAYER IS WILLING TO PAY FOR.
 *
 * `to` came straight off the request body and went to the forwarder unchecked.
 * The EIP-712 signature proves the request came from `from`, which stops one
 * person spending another's nonce — but it says nothing about where the call
 * lands. Anybody could sign their own request naming any address on Arc and
 * have this wallet fund the gas.
 *
 * The only other gate on the route is a bearer token compiled into the
 * frontend bundle, so "anybody" is the accurate word rather than a dramatic
 * one.
 *
 * Sponsoring gas is a favour to our users on our contract. It is not a public
 * relay, and the check for that belongs before any signature work.
 */

const ESCROW = "0xbdeb44945979a01584fd7d796a71C707D2F83372";
const SOMEWHERE_ELSE = "0x1111111111111111111111111111111111111111";
const SECRET = "test-secret";

async function appWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import("../../src/index.js")).default;
}

function body(to: string) {
  return {
    request: {
      from: "0x3Be7fbBDbC73Fc4731D60EF09c4BA1A94DC58E41",
      to,
      value: "0",
      gas: "200000",
      nonce: "0",
      data: "0xdeadbeef",
    },
    signature: `0x${"11".repeat(65)}`,
    chainId: 5042,
  };
}

const saved = { ...process.env };
beforeEach(() => { process.env.VERCEL = "1"; });
afterEach(() => { process.env = { ...saved }; });

const base = {
  API_SECRET: SECRET,
  CONTRACT_ADDRESS: ESCROW,
  FRONTEND_URL: "https://secureflow.work",
};

describe("which contract the relayer will sponsor", () => {
  it("refuses a call aimed anywhere but the escrow", async () => {
    const app = await appWith(base);
    const res = await request(app)
      .post("/v1/gasless/apply")
      .set("Authorization", `Bearer ${SECRET}`)
      .send(body(SOMEWHERE_ELSE));

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/escrow/i);
  });

  it("does not care how the target was cased", async () => {
    const app = await appWith(base);
    const res = await request(app)
      .post("/v1/gasless/apply")
      .set("Authorization", `Bearer ${SECRET}`)
      .send(body(ESCROW.toLowerCase()));

    // Past the target gate. Whatever happens next is signature or RPC work,
    // and it is emphatically not a 403 about the destination.
    expect(res.status).not.toBe(403);
  });

  /* A relayer that does not know its own contract must not guess. */
  it("refuses to relay at all when CONTRACT_ADDRESS is unset", async () => {
    const app = await appWith({ ...base, CONTRACT_ADDRESS: undefined });
    const res = await request(app)
      .post("/v1/gasless/apply")
      .set("Authorization", `Bearer ${SECRET}`)
      .send(body(ESCROW));

    expect(res.status).toBe(503);
  });

  /* The destination is checked before any signature or RPC work, so a
     refusal costs nothing and cannot be probed for timing. */
  it("rejects the destination without needing a valid signature", async () => {
    const app = await appWith(base);
    const res = await request(app)
      .post("/v1/gasless/apply")
      .set("Authorization", `Bearer ${SECRET}`)
      .send({ ...body(SOMEWHERE_ELSE), signature: "0xnonsense" });

    expect(res.status).toBe(403);
  });
});
