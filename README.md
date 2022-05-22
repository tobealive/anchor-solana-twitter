# anchor-solana-twitter

Aims to update, refactor and extend the v1-branch.

## Major changes 

- New api syntax
	- abandon deprecated `.rpc` in favor of `.methods` syntax

- Votings are accounts, instead of just updating a counter on an existing tweet
	- enables filtering votings by users
	- less costs for sending a vote
	- `rating` counter on the tweet becomes obsolete

- Direct messages are separate accounts instead of being a tweet
	- less cost on for dms
	- `recipient` on tweet account becomes obsolete

- Comment functionality

- Users can create aliases

