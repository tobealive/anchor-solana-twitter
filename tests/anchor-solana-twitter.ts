import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AnchorSolanaTwitter } from "../target/types/anchor_solana_twitter";
import { PublicKey, Keypair } from "@solana/web3.js";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("anchor-solana-twitter", () => {
	const program = anchor.workspace.AnchorSolanaTwitter as Program<AnchorSolanaTwitter>;
	const provider = anchor.AnchorProvider.env() as anchor.AnchorProvider;
	anchor.setProvider(provider);

	// Declare some user adresses on global scope to allow acting across tests
	let user = provider.wallet;
	// Hardcode address(e.g., your  phantom wallet) to allow testing dms in frontend
	const dmRecipient = new PublicKey("7aCWNQmgu5oi4W9kQBRRiuBkUMqCuj5xTA1DsT7vz8qa");

	// { == Helper functions ==>
	const createUser = async () => {
		const userKeypair = anchor.web3.Keypair.generate();
		const userSignature = await provider.connection.requestAirdrop(userKeypair.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
		await provider.connection.confirmTransaction(userSignature);
		return userKeypair
	}

	const sendTweet = async (user: any, tag: string, content: string) => {
		const tweetKeypair = anchor.web3.Keypair.generate();
		await program.methods.sendTweet(tag, content)
			.accounts({
				tweet: tweetKeypair.publicKey,
				user: user.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers(user instanceof (anchor.Wallet as any) ? [tweetKeypair] : [user, tweetKeypair])
			.rpc();
		return tweetKeypair;
	};

	const sendComment = async (user: any, tweetParent: PublicKey, content: string, directParent: PublicKey) => {
		const commentKeypair = anchor.web3.Keypair.generate();
		await program.methods.sendComment(tweetParent, content, directParent)
			.accounts({
				comment: commentKeypair.publicKey,
				user: user.publicKey,
				systemProgram: anchor.web3.SystemProgram.programId,
			})
			.signers(user instanceof (anchor.Wallet as any) ? [commentKeypair] : [user, commentKeypair])
			.rpc();
		return commentKeypair;
	};
	// <== }

	// { == Tests ==> 
	describe("tweets", () => {

		it("can send and update tweets", async () => {
			// Send tweet #1
			const tweet = await sendTweet(user, "veganism", "Hummus, am i right 🧆?");
			// Fetch the created tweet
			const tweetState = await program.account.tweet.fetch(tweet.publicKey);
			// Ensure it has the right data
			assert.equal(tweetState.user.toBase58(), provider.wallet.publicKey.toBase58());
			assert.equal(tweetState.tag, "veganism");
			assert.equal(tweetState.content, "Hummus, am i right 🧆?");
			assert.ok(tweetState.timestamp);

			const otherUser = await createUser();

			// Send tweet #2
			const tweetTwo = await sendTweet(otherUser, "veganism", "Yay Tofu 🍜!");
			const tweetTwoState = await program.account.tweet.fetch(tweetTwo.publicKey);
			assert.equal(tweetTwoState.user.toBase58(), otherUser.publicKey.toBase58());
			assert.equal(tweetTwoState.tag, "veganism");
			assert.equal(tweetTwoState.content, "Yay Tofu 🍜!");
			assert.ok(tweetTwoState.timestamp);

			// Update tweet #2
			await program.methods.updateTweet("baneyneys", "Freshavacados!")
				.accounts({ tweet: tweetTwo.publicKey, user: otherUser.publicKey })
				.signers([otherUser])
				.rpc();

			// Fetch updated tweets state to check if it has the right data
			const updatedTweet = await program.account.tweet.fetch(tweetTwo.publicKey);
			assert.equal(updatedTweet.tag, "baneyneys");
			assert.equal(updatedTweet.content, "Freshavacados!");
			assert.equal(updatedTweet.edited, true);
		});

		it("can send a tweet without a tag", async () => {
			// Send tweet #3 (#2 by userOne)
			const tweet = await sendTweet(user, "", "gm");
			const tweetState = await program.account.tweet.fetch(tweet.publicKey);
			assert.equal(tweetState.user.toBase58(), provider.wallet.publicKey.toBase58());
			assert.equal(tweetState.tag, "");
			assert.equal(tweetState.content, "gm");
			assert.ok(tweetState.timestamp);
		});

		it("can delete own tweets", async () => {
			const tweetToDelete = await sendTweet(user, "", "gm");

			await program.methods.deleteTweet()
				.accounts({ tweet: tweetToDelete.publicKey, user: user.publicKey })
				.rpc();
			assert.ok((await program.account.tweet.fetchNullable(tweetToDelete.publicKey)) === null);

			// Try to delete other users tweet
			const otherUser = await createUser();
			// Send tweet #4
			const tweet = await sendTweet(otherUser, "solana", "gm");
			try {
				await program.methods.deleteTweet()
					.accounts({ tweet: tweet.publicKey, user: user.publicKey })
					.rpc();

				assert.fail("We shouldn't be able to delete someone else's tweet but did.");
			} catch (error) {
				// Check if tweet account still exists with the right data
				const tweetTwoState = await program.account.tweet.fetch(tweet.publicKey);
				assert.equal(tweetTwoState.tag, "solana");
				assert.equal(tweetTwoState.content, "gm");
			}
		});

		it("cannot send a tweet without content", async () => {
			try {
				await sendTweet(user, "gm", "");
			} catch (err) {
				assert.equal(err.error.errorCode.code, "NoContent");
			}
		});

		it("cannot send a tweet with a tag > 50 or content > 280 characters", async () => {
			try {
				const tagWith51Chars = "x".repeat(51);
				await sendTweet(user, tagWith51Chars, "takes over!");
			} catch (err) {
				assert.equal(err.error.errorCode.code, "TagTooLong");
			}
			try {
				const contentWith281Chars = "x".repeat(281);
				await sendTweet(user, "veganism", contentWith281Chars);
			} catch (err) {
				assert.equal(err.error.errorCode.code, "ContentTooLong");
			}
		});

		it("cannot update a tweet without changes", async () => {
			// Send tweet #5 (#3 by userOne)
			const tweet = await sendTweet(user, "web3", "takes over!");
			const tweetState = await program.account.tweet.fetch(tweet.publicKey);
			assert.equal(tweetState.tag, "web3");
			assert.equal(tweetState.content, "takes over!");
			assert.equal(tweetState.edited, false);

			// Try to update tweet with same topic and content
			try {
				await program.methods.updateTweet("web3", "takes over!")
					.accounts({ tweet: tweet.publicKey, user: user.publicKey })
					.rpc();
			} catch (err) {
				assert.equal(err.error.errorCode.code, "NothingChanged");
				return;
			}
			assert.fail("The instruction should have failed with a tweet without changes.");
		});

		it("can fetch and filter tweets", async () => {
			const allTweets = await program.account.tweet.all();
			assert.equal(allTweets.length, 5);

			const userTweets = await program.account.tweet.all([
				// offset: 8 Discriminator
				{ memcmp: { offset: 8, bytes: user.publicKey.toBase58() } },
			]);
			// Check if the fetched amount of tweets is equal to those the use sent
			assert.equal(userTweets.length, 3);
			assert.ok(userTweets.every((tweet) => tweet.account.user.toBase58() === user.publicKey.toBase58()));

			const tagTweets = await program.account.tweet.all([
				// offset: 8 Discriminator + 32 User public key + 8 Timestamp + 4 Tag string prefix
				{ memcmp: { offset: 8 + 32 + 8 + 4, bytes: bs58.encode(Buffer.from("veganism")) } },
			]);
			assert.equal(tagTweets.length, 1);
			assert.ok(tagTweets.every((tweetAccount) => tweetAccount.account.tag === "veganism"));
		});
	})

	describe("comments", () => {
		it("can send, update and delete comments", async () => {
			const tweet = await sendTweet(user, "comment", "on me!");

			// Send comment
			const tweetComment = await sendComment(user, tweet.publicKey, "Everything alright with u?", null);
			assert.equal((await program.account.comment.fetch(tweetComment.publicKey))
				.tweet.toBase58(),
				tweet.publicKey.toBase58()
			);

			// Update comment
			await program.methods.updateComment("Everything alright with *you?")
				.accounts({ comment: tweetComment.publicKey, user: user.publicKey })
				.rpc();

			const updatedTweetComment = await program.account.comment.fetch(tweetComment.publicKey);
			assert.equal(updatedTweetComment.content, "Everything alright with *you?");
			assert.equal(updatedTweetComment.edited, true);

			// Comment on a comment
			const commentComment = await sendComment(user, tweet.publicKey, "I hope he's well", tweetComment.publicKey);
			const commentCommentState = await program.account.comment.fetch(commentComment.publicKey);
			assert.equal(commentCommentState.tweet.toBase58(), tweet.publicKey.toBase58());
			assert.equal(commentCommentState.parent.toBase58(), tweetComment.publicKey.toBase58());

			// Delete comment -  NOTE: currently no handling of child elements on parent delete
			await program.methods.deleteComment()
				.accounts({ comment: tweetComment.publicKey, user: user.publicKey })
				.rpc();
			assert.ok((await program.account.tweet.fetchNullable(tweetComment.publicKey)) === null);
		});
	})

	describe("votings", () => {
		it("can vote and update a voting on a tweet", async () => {
			const [votingPDA, _] = await PublicKey.findProgramAddress(
				[anchor.utils.bytes.utf8.encode("voting"), user.publicKey.toBuffer()],
				program.programId
			);
			const goodTweet = await sendTweet(user, "Linux", "Don't forget about the GNU 🦬");

			await program.methods.vote(goodTweet.publicKey, { dislike: {} })
				.accounts({ user: user.publicKey, voting: votingPDA })
				.rpc();

			const voting = await program.account.voting.fetch(votingPDA);
			assert.equal(voting.tweet.toBase58(), goodTweet.publicKey.toBase58());
			assert.equal(Object.keys(voting.result)[0], "dislike");
			// assert.equal(voting.result, { like: {} })

			// Update voting
			await program.methods.updateVoting({ like: {} })
				.accounts({ user: user.publicKey, voting: votingPDA })
				.rpc();

			const updatedVoting = await program.account.voting.fetch(votingPDA);
			assert.equal(Object.keys(updatedVoting.result)[0], "like");
		});

		it("can filter tweets a user has voted on", async () => {
			// eventually to filter favorite tweets
			const votings = await program.account.voting.all([
				// offset: 8 Discriminator
				{ memcmp: { offset: 8, bytes: user.publicKey.toBase58() } }
			]);
			assert.equal(votings.length, 1);
			assert.ok(votings.every((voting) => voting.account.user.toBase58() === user.publicKey.toBase58()));
		});
	})

	describe("direct messages", () => {
		it("can send a direct message to another user", async () => {
			const dmKeypair = anchor.web3.Keypair.generate();
			await program.methods.sendDm(dmRecipient, "Hey what's up?")
				.accounts({
					dm: dmKeypair.publicKey,
					user: user.publicKey,
					systemProgram: anchor.web3.SystemProgram.programId,
				})
				.signers([dmKeypair])
				.rpc();
			assert.equal((await program.account.dm.fetch(dmKeypair.publicKey)).recipient.toBase58(), dmRecipient.toBase58());
		});

		it("can fetch and filter a users direct messages", async () => {
			const allDms = await program.account.dm.all([
				{ memcmp: { offset: 8, bytes: user.publicKey.toBase58() } }
			]);
			assert.equal(allDms.length, 1);
			assert.ok(allDms.every((dm) => dm.account.user.toBase58() === user.publicKey.toBase58()));

			const userDms = await program.account.dm.all([
				// offset: 8 Discriminator + 32 User public key
				{ memcmp: { offset: 8 + 32, bytes: dmRecipient.toBase58(), } },
			]);
			assert.equal(userDms.length, 1);
			assert.ok(userDms.every((dm) => dm.account.recipient.toBase58() == dmRecipient.toBase58()));
		});
	})

	describe("user alias", () => {
		it("can create, update and delete a user alias", async () => {
			const [userAliasPDA, _] = await PublicKey.findProgramAddress(
				[anchor.utils.bytes.utf8.encode("user-alias"), user.publicKey.toBuffer()],
				program.programId
			);

			await program.methods.createUserAlias("Erwin")
				.accounts({ user: user.publicKey, userAlias: userAliasPDA })
				.rpc();
			assert.equal((await program.account.userAlias.fetch(userAliasPDA)).alias, "Erwin");

			await program.methods.updateUserAlias("Smith")
				.accounts({ user: user.publicKey, userAlias: userAliasPDA })
				.rpc();
			assert.equal((await program.account.userAlias.fetch(userAliasPDA)).alias, "Smith");

			await program.methods.deleteUserAlias()
				.accounts({ user: user.publicKey, userAlias: userAliasPDA })
				.rpc();
			assert.ok((await program.account.userAlias.fetchNullable(userAliasPDA)) === null);
		});
		// TODO: test alias creation for user users
	})
	// <== }
});
