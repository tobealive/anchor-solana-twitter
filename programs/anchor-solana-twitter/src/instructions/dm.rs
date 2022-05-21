use crate::errors::ErrorCode;
use crate::state::dm::*;
use anchor_lang::prelude::*;

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
