import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AnchorSolanaTwitter } from "../target/types/anchor_solana_twitter";
import { PublicKey } from "@solana/web3.js";
import type { Keypair } from "@solana/web3.js";
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

	// Generate keypair for a tweet, a comments and a voting on global scope for re-usage in later tests
	const tweetKeypair = anchor.web3.Keypair.generate();
	const commentKeypair = anchor.web3.Keypair.generate();
	const votingKeypair = anchor.web3.Keypair.generate();

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

		// Update the tweet
		await program.methods
			.updateTweet("baneyneys", "Freshavacados!")
			.accounts({
				tweet: tweetOneKeypair.publicKey,
				user: userOne.publicKey,
			})
			.rpc();

		// Fetch tweets state to check if it was updated
		const updatedTweet = await program.account.tweet.fetch(tweetOneKeypair.publicKey);
		assert.equal(updatedTweet.tag, "baneyneys");
		assert.equal(updatedTweet.content, "Freshavacados!");
		assert.equal(updatedTweet.edited, true);

		// Send tweet from a different user
		// Airdrop some SOL
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
	});

	// Helper function that calls the "SendTweet" instruction to stop repeating ourselves.
	const sendTweet = async (tweetKeypair: Keypair, user, tag: string, content: string) => {
		await program.methods
			.sendTweet(tag, content)
			.accounts({
				tweet: tweetKeypair.publicKey,
				user: user.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers(user instanceof (anchor.Wallet as any) ? [tweetKeypair] : [user, tweetKeypair])
			.rpc();
	};

	it("can send a tweet without a tag", async () => {
		// Send tweet #3 (#2 by userOne)
		await sendTweet(tweetKeypair, userOne, "", "gm");

		const tweet = await program.account.tweet.fetch(tweetKeypair.publicKey);
		assert.equal(tweet.user.toBase58(), programProvider.wallet.publicKey.toBase58());
		assert.equal(tweet.tag, "");
		assert.equal(tweet.content, "gm");
		assert.ok(tweet.timestamp);
	});

	it("cannot send a tweet without content", async () => {
		try {
			const tweetKeypair = anchor.web3.Keypair.generate();
			await sendTweet(tweetKeypair, userOne, "gm", "");
		} catch (err) {
			assert.equal(err.error.errorCode.code, "NoContent");
		}
	});

	it("cannot send a tweet with a tag > 50 or content > 280 characters", async () => {
		try {
			const tweetKeypair = anchor.web3.Keypair.generate();
			const tagWith51Chars = "x".repeat(51);
			await sendTweet(tweetKeypair, userOne, tagWith51Chars, "takes over!");
		} catch (err) {
			assert.equal(err.error.errorCode.code, "TagTooLong");
		}

		try {
			const tweetKeypair = anchor.web3.Keypair.generate();
			const contentWith281Chars = "x".repeat(281);
			await sendTweet(tweetKeypair, userOne, "veganism", contentWith281Chars);
		} catch (err) {
			assert.equal(err.error.errorCode.code, "ContentTooLong");
		}
	});

	it("cannot update a tweet without changes", async () => {
		// Send tweet #4 (#3 by userOne)
		const tweetKeypair = anchor.web3.Keypair.generate();
		await sendTweet(tweetKeypair, userOne, "web3", "takes over!");
		const tweet = await program.account.tweet.fetch(tweetKeypair.publicKey);
		assert.equal(tweet.tag, "web3");
		assert.equal(tweet.content, "takes over!");
		assert.equal(tweet.edited, false);

		// Try to update tweet with same topic and content
		try {
			await program.methods
				.updateTweet("web3", "takes over!")
				.accounts({
					tweet: tweetKeypair.publicKey,
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
		assert.equal(tweets.length, 4);
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

		// Check if the fetched amount of tweets is equal to those the user sent
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

	it("can send and update tweet comments", async () => {
		await program.methods
			.sendComment(tweetKeypair.publicKey, "Everything alright with u?", null)
			.accounts({
				comment: commentKeypair.publicKey,
				user: userOne.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers([commentKeypair])
			.rpc();

		assert.equal(
			(await program.account.comment.fetch(commentKeypair.publicKey)).tweet.toBase58(),
			tweetKeypair.publicKey.toBase58()
		);

		// Update comment
		await program.methods
			.updateComment("Everything alright with *you?")
			.accounts({
				comment: commentKeypair.publicKey,
				user: userOne.publicKey,
			})
			.rpc();

		const updatedComment = await program.account.comment.fetch(commentKeypair.publicKey);
		assert.equal(updatedComment.content, "Everything alright with *you?");
		assert.equal(updatedComment.edited, true);
	});

	it("can send a comment on a comment", async () => {
		const commentOnCommentKeypair = anchor.web3.Keypair.generate();
		await program.methods
			.sendComment(tweetKeypair.publicKey, "I hope he's well", commentKeypair.publicKey)
			.accounts({
				comment: commentOnCommentKeypair.publicKey,
				user: userTwo.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers([commentOnCommentKeypair, userTwo])
			.rpc();

		const commentOnComment = await program.account.comment.fetch(commentOnCommentKeypair.publicKey);
		assert.equal(commentOnComment.tweet.toBase58(), tweetKeypair.publicKey.toBase58());
		assert.equal(commentOnComment.parent.toBase58(), commentKeypair.publicKey.toBase58());
	});

	it("can vote and update a voting on a tweet", async () => {
		const tweet = anchor.web3.Keypair.generate();
		await sendTweet(tweet, userOne, "Linux", "Don't forget about the GNU 🦬");

		await program.methods
			.vote(tweet.publicKey, { like: {} })
			.accounts({
				voting: votingKeypair.publicKey,
				user: userOne.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers([votingKeypair])
			.rpc();

		const voting = await program.account.voting.fetch(votingKeypair.publicKey);
		assert.equal(voting.tweet.toBase58(), tweet.publicKey.toBase58());
		assert.equal(Object.keys(voting.result)[0], "like");
		// assert.equal(voting.result, { like: {} })

		// Update voting
		await program.methods
			.updateVoting({ noVoting: {} })
			.accounts({
				voting: votingKeypair.publicKey,
				user: userOne.publicKey,
			})
			.rpc();

		const updatedVoting = await program.account.voting.fetch(votingKeypair.publicKey);
		assert.equal(Object.keys(updatedVoting.result)[0], "noVoting");
	});

	it("can filter a users favorite(upvoted) tweets", async () => {
		const favorites = await program.account.voting.all([
			{
				memcmp: {
					offset: 8, // Discriminator
					bytes: userOne.publicKey.toBase58(),
				},
			},
		]);
		assert.equal(favorites.length, 1);
		assert.ok(favorites.every((favorite) => favorite.account.user.toBase58() === userOne.publicKey.toBase58()));
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

	it("can create and update an user alias", async () => {
		const [userAliasPDA, _] = await PublicKey.findProgramAddress(
			[anchor.utils.bytes.utf8.encode("user-alias"), userOne.publicKey.toBuffer()],
			program.programId
		);

		await program.methods
			.createAlias("Erwin")
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
	});
});
