use crate::errors::ErrorCode;
use crate::state::_len;
use anchor_lang::prelude::*;

#[account]
pub struct Comment {
	pub user: Pubkey,
	pub tweet: Pubkey,  // Pubkey commented tweet
	pub parent: Pubkey, // Pubkey of parent comment
	pub timestamp: i64,
	pub content: String,
	pub edited: bool,
}

impl Comment {
	const LEN: usize = _len::DISCRIMINATOR
        + _len::PUBLIC_KEY // user
        + _len::PUBLIC_KEY // tweet
        + _len::PUBLIC_KEY // parent
        + _len::TIMESTAMP
        + _len::STRING_LENGTH + _len::CONTENT_MAX
        + _len::EDITED;

	pub fn update(&mut self, content: String) -> Result<()> {
		require!(self.content != content, ErrorCode::NothingChanged);
		self.content = content;
		self.edited = true;
		Ok(())
	}
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
