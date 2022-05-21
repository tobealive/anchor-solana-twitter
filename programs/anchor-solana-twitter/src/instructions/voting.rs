use crate::state::voting::*;
use anchor_lang::prelude::*;

pub fn vote(ctx: Context<Vote>, tweet: Pubkey, result: VotingResult) -> Result<()> {
	let voting = &mut ctx.accounts.voting;
	// let user  = &ctx.accounts.user;
	let clock: Clock = Clock::get().unwrap();

	// voting.user = *user.key;
	voting.tweet = tweet;
	voting.timestamp = clock.unix_timestamp;
	voting.result = result;
	voting.bump = *ctx.bumps.get("voting").unwrap();

	Ok(())
}

pub fn update_voting(ctx: Context<UpdateVoting>, new_result: VotingResult) -> Result<()> {
	ctx.accounts.voting.update(new_result)
}
