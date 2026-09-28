import { Router } from "express";
import { verifyMessage } from "viem";
import {
  buildSessionAuthMessage,
  isSessionConfigured,
  issueSessionToken,
  SESSION_AUTH_MAX_AGE_MS,
  SESSION_TTL_MS,
} from "../middleware/session.js";

/**
 * One signature, one session.
 *
 * The caller signs a short message naming their wallet and the time, and gets
 * back a token every other route can trust. No nonce round trip: the timestamp
 * bounds replay to five minutes, which is the same window `upload` has been
 * using, and it keeps this stateless for a backend that may be serverless.
 */
export const authRouter = Router();

const EVM_ADDR = /^0x[0-9a-fA-F]{40}$/;

authRouter.post("/session", async (req, res) => {
  if (!isSessionConfigured()) {
    // A server that cannot sign tokens must say so rather than hand back
    // something that looks like a session and authorises nothing.
    res.status(503).json({ error: "Sessions are not configured on this server" });
    return;
  }

  const wallet = String(req.body?.wallet ?? "").trim();
  const timestamp = String(req.body?.timestamp ?? "").trim();
  const signature = String(req.body?.signature ?? "").trim();

  if (!EVM_ADDR.test(wallet)) {
    res.status(400).json({ error: "wallet must be a valid Arc EVM address (0x…)" });
    return;
  }
  if (!timestamp || !signature) {
    res.status(400).json({ error: "timestamp and signature are required" });
    return;
  }

  const ms = Number(timestamp);
  if (!Number.isFinite(ms) || Math.abs(Date.now() - ms) > SESSION_AUTH_MAX_AGE_MS) {
    res.status(401).json({ error: "Sign-in expired — please try again" });
    return;
  }

  let valid = false;
  try {
    valid = await verifyMessage({
      address: wallet as `0x${string}`,
      message: buildSessionAuthMessage(wallet, timestamp),
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }

  if (!valid) {
    res.status(401).json({ error: "Signature does not match that wallet" });
    return;
  }

  res.json({
    token: issueSessionToken(wallet),
    wallet: wallet.toLowerCase(),
    expiresInMs: SESSION_TTL_MS,
  });
});
