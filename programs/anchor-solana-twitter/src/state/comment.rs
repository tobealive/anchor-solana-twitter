use anchor_lang::prelude::*;

#[account]
pub struct Comment {
	pub user: Pubkey,
	pub tweet: Pubkey,  // Pubkey of commented tweet
	pub parent: Pubkey, // Pubkey of parent comment
	pub timestamp: i64,
	pub content: String,
	pub edited: bool,
}

#[derive(Accounts)]
pub struct SendComment<'info> {
	// space: 8 discriminator + 32 user + 32 tweet + 32 parent + 8 timestamp + (4 prefix + 280 * 4) content + 1 edited state
	#[account(init, payer = user, space = 8 + 32 + 32 + 32 + 8 + (4 + 280 * 4) + 1)]
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
pub struct DeleteComment<'info> {
	#[account(mut, has_one = user, close = user)]
	pub comment: Account<'info, Comment>,
	pub user: Signer<'info>,
}
