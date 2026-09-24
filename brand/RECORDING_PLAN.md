# Recording plan

Companion to `VIDEO_TRANSCRIPT.md`. The words are in that file and must not
change, because that transcript is already in the Drive folder and the two have
to match. This file is only about what is on screen and in what order.

Target 4:30. The hard limit is 5:00.

## How this maps to what they asked for

| Their requirement | Beats |
| --- | --- |
| Codebase Walkthrough (required) | 0:30 USDC, 1:30 Circle Wallets, 2:45 Contracts |
| Integration Demonstration (required) | 3:45 Running on mainnet |

Their order is walkthrough first, demo second. The transcript is already in
that order, so record it start to finish.

## Before you press record

Close Slack, Mail and anything that can raise a notification. Turn on Do Not
Disturb.

Open these and leave them open, in this order, so you are never hunting:

1. Editor, four tabs, each already scrolled to the right line:
   - `agent/daemon/src/config.ts` at **188**
   - `agent/daemon/src/workers/wallets.ts` at **105** (you will scroll to 156)
   - `agent/daemon/src/circle/circleSigner.ts` at **131**
   - `app/contracts/solidity/src/SecureFlow.sol` at **443** (you will jump to 606)
2. Telegram, the Atelier bot conversation, scrolled to `/start`
3. Chrome on `secureflow.work/my-jobs`, signed in as the client, both jobs visible
4. Chrome tab on `explorer.arc.io/address/0xbdeb44945979a01584fd7d796a71C707D2F83372`

Editor font at 16pt or larger. A reviewer watching at 1080p cannot read 12pt.

Hide the file tree and the terminal. The code should fill the frame.

## The beats

| Time | On screen | Note |
| --- | --- | --- |
| 0:00 | The app, or the contract address | Do not show a slide. They want the product |
| 0:30 | `config.ts` 188–189 | Highlight the `0x3600…0000` predeploy as you say it |
| 1:00 | `wallets.ts` 156 | `dripGas`. Scroll, do not cut |
| 1:30 | `circleSigner.ts` 131 | Say "the private key does not exist in our infrastructure" while it is on screen |
| 2:00 | `wallets.ts` 105–140 | Point at `listWallets`, `refId`, then `createWallets`. This is the strongest 30 seconds in the video |
| 2:45 | `SecureFlow.sol` 443 | `createEscrow` |
| 3:15 | `SecureFlow.sol` 606 | `approveMilestone`. Say "the only path by which money leaves" |
| 3:45 | Telegram | `/start`, the name, the wallet, the balance |
| 4:05 | `secureflow.work`, My Jobs | Both jobs completed, 15.51 USDC released, both rated 5/5 |
| 4:20 | explorer.arc.io | Let it sit for three seconds. Stop talking |

## Things that lose marks

- Reading the transcript in a monotone. Say it, do not recite it.
- Cutting between files with jump cuts. Scroll and switch tabs on camera; it
  reads as a real codebase rather than an edit.
- Going over 5:00. They said no longer than five minutes.
- Showing a slide deck. The deck is a separate upload. This video is the code
  and the product.

## After

Upload as **unlisted** on YouTube, or Loom, or a Drive file. Not a post or a
thread: the form says that will count against the application.

Check the link in a private window before pasting it in.
