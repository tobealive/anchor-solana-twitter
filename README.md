# anchor-solana-twitter

Aims to update, refactor and extend the v1-branch.

## Major changes

-  New api syntax

   -  abandon deprecated `.rpc` in favor of `.methods` syntax

-  Votings are accounts, instead of just updating a counter on an existing tweet

   -  enables filtering votings by users
   -  less costs for sending a vote
   -  `rating` counter on the tweet becomes obsolete

-  Direct messages are separate accounts instead of being a tweet

   -  less cost on for dms
   -  `recipient` on tweet account becomes obsolete

-  Comment functionality

-  Users can create aliases

## Tests

Needless to say that the system dependencies are solana and anchor.

`yarn install` loads some program dependencies.

Change the destination of the [provider] wallet in `Anchor.toml` according to your systems configuration.

Building and running the test happens with `anchor test`.

To use the tests while working on a frontend run the localnet with `anchor localnet` in one terminal.<br>
In another terminal airdrop your wallet some sola and load the test `solana airdrop 1000 <YourPhantomWalletPubKey> && anchor run test`.

<img src="assets/tests.jpg" alt="drawing" width="700"/>
