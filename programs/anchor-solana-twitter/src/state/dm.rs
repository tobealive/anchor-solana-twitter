use anchor_lang::prelude::*;

#[account]
pub struct Dm {
	pub user: Pubkey,
	pub recipient: Pubkey,
	pub timestamp: i64,
	pub content: String,
}

#[derive(Accounts)]
pub struct SendDm<'info> {
    // space: 8 discriminator + 32 user + 32 recipient + 8 timestamp + (4 prefix + 280 * 4) content
	#[account(init, payer = user, space = 8 + 32 + 32 + 8 + (4 * 280 * 4))]
	pub dm: Account<'info, Dm>,
	#[account(mut)]
	pub user: Signer<'info>,
	pub system_program: Program<'info, System>,
}
