import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AnchorSolanaTwitter } from "../target/types/anchor_solana_twitter";
import { PublicKey } from "@solana/web3.js";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("anchor-solana-twitter", () => {
	const program = anchor.workspace.AnchorSolanaTwitter as Program<AnchorSolanaTwitter>;
	const programProvider = anchor.AnchorProvider.env() as anchor.AnchorProvider;

	// Configure the client to use the local cluster
	anchor.setProvider(programProvider);

	// Generate keypairs on global instead of function-scope for re-usage
	const userOne = programProvider.wallet;
	const userTwo = anchor.web3.Keypair.generate();
	// Hardcoded address(e.g. your phantom wallet). Useful for tests in the frontend (e.g., to test dms)
	// alternatively change the recipient to one of the other users publicKey
	const dmRecipient = new PublicKey("7aCWNQmgu5oi4W9kQBRRiuBkUMqCuj5xTA1DsT7vz8qa");

	it("can send and update tweets", async () => {
		const tweetOneKeypair = anchor.web3.Keypair.generate();

		// Send tweet #1
		await program.methods
			.sendTweet("veganism", "Hummus, am i right 🧆?")
			.accounts({
				tweet: tweetOneKeypair.publicKey,
				user: userOne.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			// Anchor automatically signs with the connected wallets keypair
			// in scope of this test it's the program's provider.wallet
			.signers([tweetOneKeypair])
			.rpc();

		// Fetch the created tweet
		const tweet = await program.account.tweet.fetch(tweetOneKeypair.publicKey);
		// Ensure it has the right data
		assert.equal(tweet.user.toBase58(), programProvider.wallet.publicKey.toBase58());
		assert.equal(tweet.tag, "veganism");
		assert.equal(tweet.content, "Hummus, am i right 🧆?");
		assert.ok(tweet.timestamp);

		// Airdrop some SOL to different user
		const signature = await programProvider.connection.requestAirdrop(userTwo.publicKey, 1000000000);
		await programProvider.connection.confirmTransaction(signature);

		// Send tweet #2
		const tweetTwoKeypair = anchor.web3.Keypair.generate();
		await program.methods
			.sendTweet("veganism", "Yay Tofu 🍜!")
			.accounts({
				tweet: tweetTwoKeypair.publicKey,
				user: userTwo.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers([userTwo, tweetTwoKeypair])
			.rpc();

		const tweetTwo = await program.account.tweet.fetch(tweetTwoKeypair.publicKey);
		assert.equal(tweetTwo.user.toBase58(), userTwo.publicKey.toBase58());
		assert.equal(tweetTwo.tag, "veganism");
		assert.equal(tweetTwo.content, "Yay Tofu 🍜!");
		assert.ok(tweetTwo.timestamp);

		// Update tweet #2
		await program.methods
			.updateTweet("baneyneys", "Freshavacados!")
			.accounts({
				tweet: tweetTwoKeypair.publicKey,
				user: userTwo.publicKey,
			})
			.signers([userTwo])
			.rpc();

		// Fetch tweets state to check if it was updated
		const updatedTweet = await program.account.tweet.fetch(tweetTwoKeypair.publicKey);
		assert.equal(updatedTweet.tag, "baneyneys");
		assert.equal(updatedTweet.content, "Freshavacados!");
		assert.equal(updatedTweet.edited, true);
	});

	// Helper function that calls the "SendTweet" instruction to stop repeating ourselves.
	const sendTweet = async (user, tag: string, content: string) => {
		const tweetKeypair = anchor.web3.Keypair.generate();
		await program.methods
			.sendTweet(tag, content)
			.accounts({
				tweet: tweetKeypair.publicKey,
				user: user.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers(user instanceof (anchor.Wallet as any) ? [tweetKeypair] : [user, tweetKeypair])
			.rpc();

		return tweetKeypair
	};

	it("can send a tweet without a tag", async () => {
		// Send tweet #3 (#2 by userOne)
		const tweet = await sendTweet(userOne, "", "gm");
		const tweetState = await program.account.tweet.fetch(tweet.publicKey);
		assert.equal(tweetState.user.toBase58(), programProvider.wallet.publicKey.toBase58());
		assert.equal(tweetState.tag, "");
		assert.equal(tweetState.content, "gm");
		assert.ok(tweetState.timestamp);
	});

	it("can delete own tweets", async () => {
		const tweet = await sendTweet(userOne, "", "gm");

		await program.methods
			.deleteTweet()
			.accounts({
				tweet: tweet.publicKey,
				user: userOne.publicKey
			})
			.rpc();

		assert.ok((await program.account.tweet.fetchNullable(tweet.publicKey)) === null);

		// Send tweet #4
		const tweetTwo = await sendTweet(userTwo, 'solana', 'gm');
		// Try to delete other users tweet
		try {
			await program.methods.
				deleteTweet()
				.accounts({
					tweet: tweetTwo.publicKey,
					user: userOne.publicKey
				})
				.rpc()

			assert.fail("We shouldn't be able to delete someone else's tweet but did.");
		} catch (error) {
			// Check if tweet account still exists with the right data
			const tweetTwoState = await program.account.tweet.fetch(tweetTwo.publicKey);
			assert.equal(tweetTwoState.tag, 'solana');
			assert.equal(tweetTwoState.content, 'gm');
		}
	});

	it("cannot send a tweet without content", async () => {
		try {
			await sendTweet(userOne, "gm", "");
		} catch (err) {
			assert.equal(err.error.errorCode.code, "NoContent");
		}
	});

	it("cannot send a tweet with a tag > 50 or content > 280 characters", async () => {
		try {
			const tagWith51Chars = "x".repeat(51);
			await sendTweet(userOne, tagWith51Chars, "takes over!");
		} catch (err) {
			assert.equal(err.error.errorCode.code, "TagTooLong");
		}

		try {
			const contentWith281Chars = "x".repeat(281);
			await sendTweet(userOne, "veganism", contentWith281Chars);
		} catch (err) {
			assert.equal(err.error.errorCode.code, "ContentTooLong");
		}
	});

	it("cannot update a tweet without changes", async () => {
		// Send tweet #5 (#3 by userOne)
		const tweet = await sendTweet(userOne, "web3", "takes over!");
		const tweetState = await program.account.tweet.fetch(tweet.publicKey);
		assert.equal(tweetState.tag, "web3");
		assert.equal(tweetState.content, "takes over!");
		assert.equal(tweetState.edited, false);

		// Try to update tweet with same topic and content
		try {
			await program.methods
				.updateTweet("web3", "takes over!")
				.accounts({
					tweet: tweet.publicKey,
					user: userOne.publicKey,
				})
				.rpc();
		} catch (err) {
			assert.equal(err.error.errorCode.code, "NothingChanged");
			return;
		}
		assert.fail("The instruction should have failed with a tweet without changes.");
	});

	it("can fetch all tweets", async () => {
		const tweets = await program.account.tweet.all();
		assert.equal(tweets.length, 5);
	});

	it("can filter tweets by user", async () => {
		const tweets = await program.account.tweet.all([
			{
				memcmp: {
					offset: 8, // Discriminator
					bytes: userOne.publicKey.toBase58(),
				},
			},
		]);

		// Check if the fetched amount of tweets is equal to those the use sent
		assert.equal(tweets.length, 3);
		assert.ok(tweets.every((tweet) => tweet.account.user.toBase58() === userOne.publicKey.toBase58()));
	});

	it("can filter tweets by tags", async () => {
		const tweets = await program.account.tweet.all([
			{
				memcmp: {
					offset:
						8 + // Discriminator
						32 + // User public key
						8 + // Timestamp
						4, // Tag string prefix
					bytes: bs58.encode(Buffer.from("veganism")),
				},
			},
		]);
		assert.equal(tweets.length, 1);
		assert.ok(tweets.every((tweetAccount) => tweetAccount.account.tag === "veganism"));
	});

	it("can send, update and delete comments", async () => {
		// Helper function that calls the "SendComment" instruction 
		const sendComment = async (user, tweetParent: PublicKey, content: string, directParent: PublicKey) => {
			const commentKeypair = anchor.web3.Keypair.generate();
			await program.methods
				.sendComment(tweetParent, content, directParent)
				.accounts({
					comment: commentKeypair.publicKey,
					user: user.publicKey,
					systemProgram: anchor.web3.SystemProgram.programId,
				})
				.signers(user instanceof (anchor.Wallet as any) ? [commentKeypair] : [user, commentKeypair])
				.rpc();

			return commentKeypair
		};

		// Send tweet to comment on
		const tweet = await sendTweet(userOne, "comment", "on me!");

		// Send comment
		const tweetComment = await sendComment(userOne, tweet.publicKey, "Everything alright with u?", null)
		assert.equal(
			(await program.account.comment.fetch(tweetComment.publicKey)).tweet.toBase58(),
			tweet.publicKey.toBase58()
		);

		// Update comment
		await program.methods
			.updateComment("Everything alright with *you?")
			.accounts({
				comment: tweetComment.publicKey,
				user: userOne.publicKey,
			})
			.rpc();

		const updatedTweetComment = await program.account.comment.fetch(tweetComment.publicKey);
		assert.equal(updatedTweetComment.content, "Everything alright with *you?");
		assert.equal(updatedTweetComment.edited, true);

		// Comment on a comment
		const commentComment = await sendComment(userOne, tweet.publicKey, "I hope he's well", tweetComment.publicKey)
		const commentCommentState = await program.account.comment.fetch(commentComment.publicKey);
		assert.equal(commentCommentState.tweet.toBase58(), tweet.publicKey.toBase58());
		assert.equal(commentCommentState.parent.toBase58(), tweetComment.publicKey.toBase58());

		// Delete comment
		await program.methods
			.deleteComment()
			.accounts({
				comment: tweetComment.publicKey,
				user: userOne.publicKey
			})
			.rpc();

		assert.ok((await program.account.tweet.fetchNullable(tweetComment.publicKey)) === null);
	});

	it("can vote and update a voting on a tweet", async () => {
		const [votingPDA, _] = await PublicKey.findProgramAddress(
			[anchor.utils.bytes.utf8.encode("voting"), userOne.publicKey.toBuffer()],
			program.programId
		);
		const goodTweet = await sendTweet(userOne, "Linux", "Don't forget about the GNU 🦬");


		await program.methods
			.vote(goodTweet.publicKey, { dislike: {} })
			.accounts({
				user: userOne.publicKey,
				voting: votingPDA,
			})
			.rpc();

		const voting = await program.account.voting.fetch(votingPDA);
		assert.equal(voting.tweet.toBase58(), goodTweet.publicKey.toBase58());
		assert.equal(Object.keys(voting.result)[0], "dislike");
		// assert.equal(voting.result, { like: {} })

		// Update voting
		await program.methods
			.updateVoting({ like: {} })
			.accounts({
				user: userOne.publicKey,
				voting: votingPDA
			})
			.rpc();

		const updatedVoting = await program.account.voting.fetch(votingPDA);
		assert.equal(Object.keys(updatedVoting.result)[0], "like");
	});

	it("can filter a users favorite(upvoted) tweets", async () => {
		const votings = await program.account.voting.all([
			{
				memcmp: {
					offset:
						8, // Discriminator
					bytes: userOne.publicKey.toBase58(),
				},
			},
		]);
		assert.equal(votings.length, 1);
		assert.ok(votings.every((favorite) => favorite.account.user.toBase58() === userOne.publicKey.toBase58()));
	});

	it("can send a direct message to another user", async () => {
		const dmKeypair = anchor.web3.Keypair.generate();
		await program.methods
			.sendDm(dmRecipient, "Hey what's up?")
			.accounts({
				dm: dmKeypair.publicKey,
				user: userOne.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers([dmKeypair])
			.rpc();

		assert.equal((await program.account.dm.fetch(dmKeypair.publicKey)).recipient.toBase58(), dmRecipient.toBase58());
	});

	it("can filter all direct messages a user has sent", async () => {
		const dms = await program.account.dm.all([
			{
				memcmp: {
					offset: 8, // Discriminator
					bytes: userOne.publicKey.toBase58(),
				},
			},
		]);
		assert.equal(dms.length, 1);
		assert.ok(dms.every((dm) => dm.account.user.toBase58() === userOne.publicKey.toBase58()));
	});

	it("can filter direct messages sent to a specific user", async () => {
		const dms = await program.account.dm.all([
			{
				memcmp: {
					offset:
						8 + // Discriminator
						32, // User public key
					bytes: dmRecipient.toBase58(),
				},
			},
		]);
		assert.equal(dms.length, 1);
		assert.ok(dms.every((dm) => dm.account.recipient.toBase58() == dmRecipient.toBase58()));
	});

	it("can create, update and delete a user alias", async () => {
		const [userAliasPDA, _] = await PublicKey.findProgramAddress(
			[anchor.utils.bytes.utf8.encode("user-alias"), userOne.publicKey.toBuffer()],
			program.programId
		);

		await program.methods
			.createUserAlias("Erwin")
			.accounts({
				user: userOne.publicKey,
				userAlias: userAliasPDA,
			})
			.rpc();

		assert.equal((await program.account.userAlias.fetch(userAliasPDA)).alias, "Erwin");

		await program.methods
			.updateUserAlias("Smith")
			.accounts({
				user: userOne.publicKey,
				userAlias: userAliasPDA,
			})
			.rpc();

		assert.equal((await program.account.userAlias.fetch(userAliasPDA)).alias, "Smith");

		await program.methods
			.deleteUserAlias()
			.accounts({
				user: userOne.publicKey,
				userAlias: userAliasPDA,
			})
			.rpc();

		assert.ok((await program.account.userAlias.fetchNullable(userAliasPDA)) === null);
	});
});
