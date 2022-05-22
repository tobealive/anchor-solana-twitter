use crate::state::_len;
use anchor_lang::prelude::*;

#[account]
pub struct Dm {
	pub user: Pubkey,
	pub recipient: Pubkey,
	pub timestamp: i64,
	pub content: String,
}

impl Dm {
	const LEN: usize = _len::DISCRIMINATOR
        + _len::PUBLIC_KEY // user
        + _len::PUBLIC_KEY // recipient
        + _len::TIMESTAMP
        + _len::STRING_LENGTH + _len::CONTENT_MAX;
}

#[derive(Accounts)]
pub struct SendDm<'info> {
	#[account(init, payer = user, space = Dm::LEN)]
	pub dm: Account<'info, Dm>,
	#[account(mut)]
	pub user: Signer<'info>,
	pub system_program: Program<'info, System>,
}
