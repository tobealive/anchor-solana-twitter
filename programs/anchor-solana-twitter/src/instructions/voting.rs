use crate::errors::ErrorCode;
use crate::state::voting::*;
use anchor_lang::prelude::*;

pub fn vote(ctx: Context<Vote>, tweet: Pubkey, result: VotingResult, voting_bump: u8) -> Result<()> {
	let voting = &mut ctx.accounts.voting;
	let clock: Clock = Clock::get().unwrap();

	voting.user = *ctx.accounts.user.key;
	voting.tweet = tweet;
	voting.timestamp = clock.unix_timestamp;
	voting.result = result;
	voting.bump = voting_bump;

	Ok(())
}

pub fn update_voting(ctx: Context<UpdateVoting>, new_result: VotingResult) -> Result<()> {
	let voting = &mut ctx.accounts.voting;
	require!(voting.result != new_result, ErrorCode::NothingChanged);
	voting.result = new_result;
	Ok(())
}
