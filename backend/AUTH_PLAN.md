# Replacing the shared API secret

`VITE_API_SECRET` is a 64-character bearer token compiled into the frontend
bundle. It is readable from DevTools on secureflow.work today, and it is the
only gate on eight routers.

Rotating it changes nothing: the replacement ships in the next bundle exactly
as the old one did. The fix is to stop asking "does the caller know a secret"
and start asking "can the caller prove they are the wallet they claim to be",
which `upload` and `disputes` already do.

## What the secret actually protects

Fifteen endpoints, in four groups by what goes wrong.

### A. Impersonation — the worst of it

| Endpoint | The problem |
|---|---|
| `POST /v1/messages` | `sender_address` is taken from the request body. Anyone can send a message as any wallet |
| `POST /v1/notifications` | `wallet_address` from the body. Anyone can plant a notification on anyone |

A forged message from a client to a freelancer, or a notification saying a
dispute was resolved, lands in the product looking exactly like the real
thing. This is not credit burn; it is somebody else speaking in your users'
names, in a product whose entire pitch is that nobody has to be trusted.

### B. Private reads

| Endpoint | The problem |
|---|---|
| `GET /v1/notifications?wallet=` | Any caller reads any wallet's notifications |
| `GET /v1/messages/conversation` | Any caller reads any two parties' conversation |
| `GET /v1/messages/inbox` | Same |
| `GET /v1/messages/unread-count` | Same |
| `GET /v1/applications/:escrowId` | Applicant cover letters for any job |

Private correspondence between a client and a freelancer, readable by anyone
who opens DevTools.

### C. Costs money, no identity needed

| Endpoint | The problem |
|---|---|
| `POST /v1/ai/milestones` | Groq credits |
| `POST /v1/ai/cover-letter` | Groq credits |
| `POST /v1/ai/rewrite` | Groq credits |
| `POST /v1/evidence/upload` | Pinata pinning quota |

Already behind a per-IP limiter, which helps and does not solve it.

### D. Already correct — copy these

| Endpoint | How |
|---|---|
| `POST /v1/upload/milestone` | Wallet signature + on-chain party check |
| `POST /v1/disputes/resolution` | Wallet signature |
| `POST /v1/gasless/apply` | EIP-712 request signature + destination allowlist |

## The design

### Do not sign every request

The obvious move — sign each call the way `upload` does — is wrong here.
`upload` is a deliberate action a person takes once. `GET /v1/notifications`
polls. A wallet prompt per poll is unusable, and users would learn to click
through prompts, which is worse than no prompts.

So: **sign once per session, exchange it for a short-lived token.**

1. Client asks `GET /v1/auth/nonce?wallet=0x…`
2. Server returns a nonce, remembers it briefly
3. Client signs a SIWE-style message naming the domain, wallet, nonce and issue time
4. Client posts it to `POST /v1/auth/session`
5. Server verifies with `verifyMessage`, checks the nonce is unused and fresh,
   issues a signed token carrying `{ wallet, exp }` — an hour is plenty
6. Every later request sends `Authorization: Bearer <token>`

One wallet prompt per session. The server then knows the caller's wallet on
every request without trusting anything in the body.

### What that lets every route do

`req.wallet` becomes trustworthy, so:

- `POST /v1/messages` ignores `sender_address` and uses `req.wallet`
- `POST /v1/notifications` only creates notifications addressed to a wallet the
  caller can act for
- `GET /v1/notifications?wallet=X` requires `X === req.wallet`
- Message reads require the caller to be one of the two parties
- AI routes rate-limit per wallet rather than per IP

Most of these are one line once the middleware exists. The work is the
middleware and the session, not the routes.

### The client is one file

Every call already funnels through `apiFetch` in `app/src/lib/api.ts`, with a
single `authHeaders()`. There are 14 importers and none of them build their own
requests.

`lib/api.ts` is a plain module with no React context, so it needs the signer
handed to it: a `setApiSigner(signFn)` called once from the wallet provider,
and a cached session token with a refresh on 401. That is the whole client
change.

## Shipping it without breaking the app

Three deploys, each safe on its own.

**1. Backend accepts both.** Add `/v1/auth/*`, add the middleware, and have it
accept either a valid session token or the old bearer secret. Nothing breaks:
the current frontend keeps working untouched. Ship and confirm.

**2. Frontend switches.** `apiFetch` obtains and sends a session token, and
stops sending the secret. Body fields like `sender_address` come off the
requests. Ship and confirm real traffic is arriving with tokens.

**3. Backend stops accepting the secret.** Delete the fallback and
`VITE_API_SECRET`. Now the bundle carries nothing worth stealing.

Never do 3 before 2 is confirmed live, or every user is logged out of the API
at once.

## Order of work

1. Session endpoints and middleware, backend, with tests
2. Dual-accept deploy
3. `apiFetch` session handling, one file
4. Per-route tightening — `req.wallet` replacing body fields, ownership checks
   on reads
5. Drop the secret

Steps 1–3 are the security fix. Step 4 is where the impersonation and private
read problems actually close, and it is small once `req.wallet` is real.

## What to do before any of this lands

The `/v1/ai` limiter is per IP and the AI routes are the only ones that spend
money per call. If that becomes a problem before this work ships, tighten the
limiter — it is a smaller change than everything above.
