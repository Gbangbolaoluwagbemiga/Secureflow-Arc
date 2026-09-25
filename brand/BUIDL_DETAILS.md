SecureFlow is milestone escrow for freelance work, live on Arc mainnet. A client funds the whole job before anyone applies, the contract holds the money, and it pays out milestone by milestone as the work is approved. We never hold the funds and we cannot decide a dispute.

## The problem

Freelancers get paid after the work, on the client's goodwill. An invoice chased across a border to someone who already has the files, with nobody to appeal to when they stop replying.

Escrow is the obvious fix. But every version of it so far asked the person being paid to hold a volatile gas token, guard a seed phrase and bridge a stablecoin. The people with the least protection from non-payment were the ones least able to use the cure.

## How it works

1. The client funds the full budget into the contract before the job is listed
2. Freelancers apply against criteria that were fixed before the job opened
3. Work is submitted per milestone, with attachments, visible to both sides
4. The client approves, and payment goes straight to the freelancer in USDC

There is no payout window and no administrative withdrawal. A dispute goes to a named arbiter panel, never to us, and the arbiter's decision and its reason are written on chain.

## A freelancer never has to install a wallet

This is the part that separates SecureFlow from everything else in the category.

A freelancer messages our Telegram bot and gives a name. A Circle developer-controlled wallet is created behind that conversation and funded with enough USDC to sign. The wallet is stamped with their Telegram id as a `refId`, so the same person always returns to the same address even if our database is lost entirely.

Because USDC is the native gas token on Arc, they are paid in the same asset they pay gas with. No bridge, no swap, no second token to acquire before the first job.

## Autopilot

A client can hand the running of a job to an agent. It turns a sentence into a brief, scores every applicant against the published criteria, hires one, reviews the delivery and releases payment, signing with a Circle MPC wallet.

It is constrained by the contract, not by our good intentions. It cannot pay itself, cannot move money off the contract's paths, and cannot settle a dispute. Raise one and it goes to a human arbiter. The freelancer is told the moment an agent takes over and the moment it hands back.

## Where Circle fits

| Product | How we use it |
| --- | --- |
| USDC | The unit of account and the native gas token on Arc. Every escrow, payout and gas drip is USDC |
| Circle Wallets | Developer-controlled MPC wallets, provisioned per freelancer from Telegram and keyed by `refId`. Also the agent's signer, so no raw key exists in our infrastructure |
| Contracts | A UUPS proxy on Arc mainnet holding the escrow, the milestones, the arbiter panel and the dispute record |

## Live today

Real jobs, real strangers, real money on Arc mainnet:

- **15.51 USDC** released to two different freelancers across two completed jobs
- Both parties rated each other five out of five, with written reviews
- One job went through a full revision cycle, and another through a dispute resolved by an arbiter
- **978 tests** passing across the contract, the app, the API and the agent daemon, including invariant and fork suites

Every escrow, application, approval and payout is public at `0xbdeb44945979a01584fd7d796a71C707D2F83372`.

SecureFlow also runs on Stellar.

## Built, not yet finished

A yield controller is deployed on Arc: the opt-in, the per-escrow ceiling, the unwind on payout and the earnings split are all live and covered by tests, with 60% of anything earned going to the freelancer. No venue adapter is attached yet, and the product says so rather than implying a return it cannot pay.

## Links

- Product: https://secureflow.work
- Code: https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc
- Contract: https://explorer.arc.io/address/0xbdeb44945979a01584fd7d796a71C707D2F83372
