use crate::errors::ErrorCode;
use crate::state::_len;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateUserAlias<'info> {
	#[account(init, payer = user, space = UserAlias::LEN, seeds = [b"user-alias", user.key().as_ref()], bump)]
	pub user_alias: Account<'info, UserAlias>,
	pub system_program: Program<'info, System>,
	#[account(mut)]
	pub user: Signer<'info>,
}

impl UserAlias {
	const LEN: usize = _len::DISCRIMINATOR
		+ _len::STRING_LENGTH
		+ _len::ALIAS_MAX
		+ _len::BUMP;

	pub fn update(&mut self, new_alias: String) -> Result<()> {
		require!(self.alias != new_alias, ErrorCode::NothingChanged);
		require!(self.alias.chars().count() <= 50, ErrorCode::AliasTooLong);
		self.alias = new_alias;
		Ok(())
	}
}

#[derive(Accounts)]
pub struct UpdateUserAlias<'info> {
	pub user: Signer<'info>,
	#[account(mut, seeds = [b"user-alias", user.key().as_ref()], bump = user_alias.bump)]
	pub user_alias: Account<'info, UserAlias>,
}

#[account]
pub struct UserAlias {
	pub alias: String,
	pub bump: u8,
}
