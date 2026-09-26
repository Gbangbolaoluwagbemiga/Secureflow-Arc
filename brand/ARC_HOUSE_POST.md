# Arc House post

Every figure below was read off mainnet on 26 September 2026. Re-check before
posting if time has passed.

---

**Title** (95 chars)

SecureFlow is live on Arc mainnet: milestone escrow where the freelancer never installs a wallet

---

**Body**

We are live on Arc mainnet. SecureFlow is milestone escrow for freelance work, and I would like people here to actually use it and tell me what breaks.

**The problem it exists for**

Freelancers get paid after the work, on the client's goodwill. An invoice chased across a border to someone who already has the files, with nobody to appeal to when they stop replying.

Escrow is the obvious answer. But every version of it so far asked the person being paid to hold a volatile gas token, guard a seed phrase and bridge a stablecoin. The people with the least protection from non-payment were the ones least able to use the cure.

**What is actually live**

Four escrows have been created on mainnet. Two ran to completion and released in full, 15.51 USDC to two different freelancers who are not me, and both parties rated each other five out of five with written reviews. One client cancelled before hiring and was refunded. One went to a dispute, and an arbiter refunded the client in full, with the decision, the split and the arbiter's reason written on chain where the freelancer can read them.

That last one matters more than the two successes. The unhappy path has been walked by real people.

**If you are a client**

Go to https://secureflow.work, connect a wallet, post a job. The full budget enters the contract before anyone applies, so applicants can see the money is real. You approve milestone by milestone and payment goes straight to the freelancer. The platform fee is currently 1%, set on chain, and shown on the confirmation screen before you sign.

You can also hand the whole job to an agent. It turns a sentence into a brief, scores every applicant against criteria published before anyone applied, hires one, reviews the delivery and releases payment. It cannot pay itself, cannot move money off the contract's paths, and cannot settle a dispute. That is enforced by the contract, not by my good intentions.

**If you are a freelancer**

You do not need a wallet. Message https://t.me/The_Atelierbot, give it a name, and a Circle developer-controlled wallet is created for you and funded with enough USDC to sign. It is stamped with your Telegram id, so you come back to the same address even if my database burns down.

Because USDC is the native gas token on Arc, you are paid in the same asset you pay gas with. No bridge, no swap, nothing to buy before your first job.

If you already have a wallet, use the website instead. Both paths reach the same contract.

**What is not finished, so nobody is surprised**

A yield controller is deployed and wired to the escrow: the opt-in, the per-escrow ceiling, the unwind on payout and the 60/40 split with the freelancer are live and covered by tests. No venue is attached to it yet.

I asked about this in dev-chat and then went and checked. The Aave V4 USDC market on Arc is sitting at a fraction of a percent utilisation, so supply APY is zero and escrow would earn nothing there. Morpho looks like the better home and I am working on it. Until that lands the product says it earns nothing, because it earns nothing.

**Everything, so you can check rather than trust**

- Product: https://secureflow.work
- Telegram bot: https://t.me/The_Atelierbot
- Code: https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc
- Escrow proxy (UUPS): https://explorer.arc.io/address/0xbdeb44945979a01584fd7d796a71C707D2F83372
- Escrow implementation: https://explorer.arc.io/address/0xFCDF43ECc661C48B5eF55B67363d96021c9803DF
- Yield controller: https://explorer.arc.io/address/0x92a0C47e819b84069eb95776497421850103aa37

Every escrow, application, approval, dispute and payout is public at those addresses. 978 tests across the contract, the app, the API and the agent daemon.

**Please break it**

This is the part I actually want from this post. Post a job, apply for one, raise a dispute on purpose, try the bot with no wallet at all and see how far you get. If something is confusing, slow, or says a number that does not match your wallet, tell me here or open an issue on the repo. I have fixed a dozen things this week that only showed up because somebody who was not me used it.
