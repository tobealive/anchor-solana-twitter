use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod anchor_solana_twitter {
	use super::*;

	pub fn send_tweet(ctx: Context<SendTweet>, tag: String, content: String) -> Result<()> {
		let tweet = &mut ctx.accounts.tweet;
		let user: &Signer = &ctx.accounts.user;
		let clock: Clock = Clock::get().unwrap();

		require!(tag.chars().count() <= 50, ErrorCode::TagTooLong);
		require!(content.chars().count() <= 280, ErrorCode::ContentTooLong);
		require!(content.chars().count() > 0, ErrorCode::NoContent);

		tweet.user = *user.key;
		tweet.timestamp = clock.unix_timestamp;
		tweet.tag = tag;
		tweet.content = content;
		tweet.edited = false;

		Ok(())
	}

	pub fn update_tweet(
		ctx: Context<UpdateTweet>,
		new_tag: String,
		new_content: String,
	) -> Result<()> {
		ctx.accounts.tweet.update(new_tag, new_content)
	}

	pub fn delete_tweet(_ctx: Context<DeleteTweet>) -> Result<()> {
		Ok(())
	}

	pub fn send_comment(
		ctx: Context<SendComment>,
		tweet: Pubkey,
		content: String,
		parent: Option<Pubkey>,
	) -> Result<()> {
		let comment = &mut ctx.accounts.comment;
		let user: &Signer = &ctx.accounts.user;
		let clock: Clock = Clock::get().unwrap();

		require!(content.chars().count() <= 280, ErrorCode::ContentTooLong);

		comment.user = *user.key;
		comment.tweet = tweet;
		comment.parent = parent.unwrap_or(tweet);
		comment.timestamp = clock.unix_timestamp;
		comment.content = content;
		comment.edited = false;

		Ok(())
	}

	pub fn update_comment(ctx: Context<UpdateComment>, new_content: String) -> Result<()> {
		ctx.accounts.comment.update(new_content)
	}

	pub fn vote(ctx: Context<Vote>, tweet: Pubkey, result: VotingResult) -> Result<()> {
		let voting = &mut ctx.accounts.voting;
		let user: &Signer = &ctx.accounts.user;
		let clock: Clock = Clock::get().unwrap();

		voting.user = *user.key;
		voting.tweet = tweet;
		voting.timestamp = clock.unix_timestamp;
		voting.result = result;

		Ok(())
	}

	pub fn update_voting(ctx: Context<UpdateVoting>, new_result: VotingResult) -> Result<()> {
		ctx.accounts.voting.update(new_result)
	}

	pub fn send_dm(ctx: Context<SendDm>, recipient: Pubkey, content: String) -> Result<()> {
		let dm = &mut ctx.accounts.dm;
		let user: &Signer = &ctx.accounts.user;
		let clock: Clock = Clock::get().unwrap();

		require!(content.chars().count() <= 280, ErrorCode::ContentTooLong);

		dm.user = *user.key;
		dm.recipient = recipient;
		dm.timestamp = clock.unix_timestamp;
		dm.content = content;

		Ok(())
	}
}

#[derive(Accounts)]
pub struct SendTweet<'info> {
	#[account(init, payer = user, space = Tweet::LEN)]
	pub tweet: Account<'info, Tweet>,
	#[account(mut)]
	pub user: Signer<'info>,
	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTweet<'info> {
	#[account(mut, has_one = user)]
	pub tweet: Account<'info, Tweet>,
	pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteTweet<'info> {
	#[account(mut, has_one = user, close = user)]
	pub tweet: Account<'info, Tweet>,
	pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct SendComment<'info> {
	#[account(init, payer = user, space = Comment::LEN)]
	pub comment: Account<'info, Comment>,
	#[account(mut)]
	pub user: Signer<'info>,
	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateComment<'info> {
	#[account(mut, has_one = user)]
	pub comment: Account<'info, Comment>,
	pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
	#[account(init, payer = user, space = Voting::LEN)]
	pub voting: Account<'info, Voting>,
	#[account(mut)]
	pub user: Signer<'info>,
	pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVoting<'info> {
	#[account(mut, has_one = user)]
	pub voting: Account<'info, Voting>,
	pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct SendDm<'info> {
	#[account(init, payer = user, space = Dm::LEN)]
	pub dm: Account<'info, Dm>,
	#[account(mut)]
	pub user: Signer<'info>,
	pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VotingResult {
	Like,
	NoVoting,
	Dislike,
}

#[account]
pub struct Tweet {
	pub user: Pubkey,
	pub timestamp: i64,
	pub tag: String,
	pub content: String,
	pub edited: bool,
}

#[account]
pub struct Comment {
	pub user: Pubkey,
	pub tweet: Pubkey,  // Pubkey commented tweet
	pub parent: Pubkey, // Pubkey of parent comment
	pub timestamp: i64,
	pub content: String,
	pub edited: bool,
}

#[account]
pub struct Voting {
	pub user: Pubkey,
	pub tweet: Pubkey,
	pub timestamp: i64,
	pub result: VotingResult,
}

#[account]
pub struct Dm {
	pub user: Pubkey,
	pub recipient: Pubkey,
	pub timestamp: i64,
	pub content: String,
}

// Sizing properties
const DISCRIMINATOR_LENGTH: usize = 8;
const PUBLIC_KEY_LENGTH: usize = 32;
const TIMESTAMP_LENGTH: usize = 8;
const STRING_LENGTH_PREFIX: usize = 4; // Stores size of the string
const MAX_TAG_LENGTH: usize = 50 * 4; // 50 chars max
const MAX_CONTENT_LENGTH: usize = 280 * 4; // 280  chars max
const EDITED_LENGTH: usize = 1; // bool
const VOTING_RESULT_LENGTH: usize = 1; // enum

// Total size of accounts
impl Tweet {
	const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // user 
        + TIMESTAMP_LENGTH
        + STRING_LENGTH_PREFIX + MAX_TAG_LENGTH
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH
        + EDITED_LENGTH;

	pub fn update(&mut self, tag: String, content: String) -> Result<()> {
		require!(
			self.tag != tag && self.content != content,
			ErrorCode::NothingChanged
		);
		require!(tag.chars().count() <= 50, ErrorCode::TagTooLong);
		require!(content.chars().count() <= 280, ErrorCode::ContentTooLong);

		self.tag = tag;
		self.content = content;
		self.edited = true;

		Ok(())
	}
}

impl Comment {
	const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // user
        + PUBLIC_KEY_LENGTH // tweet
        + PUBLIC_KEY_LENGTH // parent
        + TIMESTAMP_LENGTH
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH
        + EDITED_LENGTH;

	pub fn update(&mut self, content: String) -> Result<()> {
		require!(self.content != content, ErrorCode::NothingChanged);
		self.content = content;
		self.edited = true;
		Ok(())
	}
}

impl Voting {
	const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // user
        + PUBLIC_KEY_LENGTH // tweet
        + TIMESTAMP_LENGTH
        + VOTING_RESULT_LENGTH;

	pub fn update(&mut self, result: VotingResult) -> Result<()> {
		require!(self.result != result, ErrorCode::NothingChanged);
		self.result = result;
		Ok(())
	}
}

impl Dm {
	const LEN: usize = DISCRIMINATOR_LENGTH
        + PUBLIC_KEY_LENGTH // user
        + PUBLIC_KEY_LENGTH // recipient
        + TIMESTAMP_LENGTH
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH;
}

#[error_code]
pub enum ErrorCode {
	#[msg("Exceeding maximum tag length of 50 characters")]
	TagTooLong,
	#[msg("Trying to send a tweet without content")]
	ContentTooLong,
	#[msg("Nothing that could be updated")]
	NoContent,
	#[msg("Exceeding maximum content length of 280 characters")]
	NothingChanged,
}
