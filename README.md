# anchor-solana-twitter

This branch is an updated, refactored and extended version of v1

## Major changes 

- New api syntax
	- abandon deprecated `.rpc` program namespaces in favor of `.methods`

- Votes are a separate account instead of updating a counter on a existing tweet
	- less costs for sending a vote
	- users being able to filter favorite tweets
	- `rating` counter on the tweet becomes obsolete

- Direct messages are a separate account instead of being a tweet
	- less cost on for dms
	- `recipient` on tweet account becomes obsolete

- Comment functionality
