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

How to install the prerequisites to run an anchor program, is nicely explained in the [anchor book][1].

Having the prerequisites out of the way, the `yarn` command will load some program dependencies.

To then be able to run the tests: change the destination of **`wallet`** under the `[provider]` section in the `Anchor.toml` file according to your systems configuration. 
Usually, it should be enough to change the home path.

Building and running the test happens with `anchor test`.

To use the tests while working on a frontend run the localnet with `anchor localnet`.<br>
In another terminal airdrop your wallet some SOL and load the test `solana airdrop 1000 <YourPhantomWalletPubKey> && anchor run test`.

### Tested functionalities

```
❯ anchor test                                                                                              
tweets
	✔ can send and update tweets
	✔ can send a tweet without a tag
	✔ can delete own tweets
	✔ cannot send a tweet without content
	✔ cannot send a tweet with a tag > 50 or content > 280 characters
	✔ cannot update a tweet without changes
	✔ can fetch and filter tweets
comments
	✔ can send, update and delete comments
votings
	✔ can vote and update votings for tweets
	✔ can derive tweets from a users votings
direct messages
	✔ can send a direct message to another user
	✔ can fetch and filter a users direct messages
user alias
	✔ can create, update and delete a user alias
```

[1]: https://book.anchor-lang.com/getting_started/installation.html

