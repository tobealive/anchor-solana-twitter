use crate::errors::ErrorCode;
use crate::state::_len;
use anchor_lang::prelude::*;

#[account]
pub struct Tweet {
	pub user: Pubkey,
	pub timestamp: i64,
	pub tag: String,
	pub content: String,
	pub edited: bool,
}

impl Tweet {
	const LEN: usize = _len::DISCRIMINATOR
        + _len::PUBLIC_KEY // user 
        + _len::TIMESTAMP
        + _len::STRING_LENGTH + _len::TAG_MAX
        + _len::STRING_LENGTH + _len::CONTENT_MAX
        + _len::EDITED;

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
