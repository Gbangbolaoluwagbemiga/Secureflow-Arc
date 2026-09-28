import type { RequestHandler } from "express";
import { walletFromSessionToken } from "./session.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * The wallet this caller proved they control, lowercased.
       *
       * Set only when the request carried a valid session token. Absent when
       * the caller authenticated with the legacy shared secret, which proves
       * nothing about who they are — so a route that needs an identity must
       * check for it rather than assume it.
       */
      wallet?: string;
    }
  }
}

/**
 * Accepts either a wallet session token or the legacy shared secret.
 *
 * Both during the migration, on purpose. Dropping the secret before the
 * frontend sends tokens would log every user out of the API at once, so the
 * order is: ship this, ship the frontend, then delete the secret path.
 *
 * The session is tried first. A caller who has one gets `req.wallet`, and
 * routes can start relying on it while the old path still works for anyone
 * running yesterday's bundle.
 */
export function requireApiSecret(
  apiSecret: string | undefined,
): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (token) {
      const wallet = walletFromSessionToken(token);
      if (wallet) {
        req.wallet = wallet;
        next();
        return;
      }
    }

    // No secret configured: the server is open, and index.ts warns about it at
    // boot. Unchanged from before so local development keeps working.
    if (!apiSecret) {
      next();
      return;
    }

    if (header !== `Bearer ${apiSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

/**
 * For routes that need to know who is calling, not merely that they got in.
 *
 * Nothing uses this yet. It is the gate each route moves behind once the
 * frontend is sending tokens, and it exists now so that move is a one-line
 * change per route rather than a design decision per route.
 */
export const requireWallet: RequestHandler = (req, res, next) => {
  if (!req.wallet) {
    res.status(401).json({
      error: "This endpoint needs a wallet session. Sign in at POST /v1/auth/session.",
    });
    return;
  }
  next();
};
