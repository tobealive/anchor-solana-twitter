use anchor_lang::prelude::*;

#[account]
pub struct UserAlias {
	pub alias: String,
	pub bump: u8,
}

#[derive(Accounts)]
pub struct CreateUserAlias<'info> {
    // space: 8 discriminator + (4 length prefix + 50 * 4 ) alias + 1 bump
	#[account(init, payer = user, space = 8 + (4 + 50 * 4) + 1, seeds = [b"user-alias", user.key().as_ref()], bump)]
	pub user_alias: Account<'info, UserAlias>,
	pub system_program: Program<'info, System>,
	#[account(mut)]
	pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateUserAlias<'info> {
	pub user: Signer<'info>,
	#[account(mut, seeds = [b"user-alias", user.key().as_ref()], bump = user_alias.bump)]
	pub user_alias: Account<'info, UserAlias>,
}

#[derive(Accounts)]
pub struct DeleteUserAlias<'info> {
    pub user: Signer<'info>,
	#[account(mut, close = user, seeds = [b"user-alias", user.key().as_ref()], bump = user_alias.bump)]
	pub user_alias: Account<'info, UserAlias>,
}
