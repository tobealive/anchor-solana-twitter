use crate::errors::ErrorCode;
use crate::state::_len;
use anchor_lang::prelude::*;

#[account]
pub struct Voting {
	// pub user: Pubkey,
	pub tweet: Pubkey,
	pub timestamp: i64,
	pub result: VotingResult,
	pub bump: u8,
}

impl Voting {
    // Discriminator 8 + Pubkey 32 + Timestamp 8 + Voting Result 1 + Bump 1
	const LEN: usize = _len::DISCRIMINATOR
        // + PUBLIC_KEY // user
        + _len::PUBLIC_KEY // tweet
        + _len::TIMESTAMP
        + _len::VOTING_RESULT
        + _len::BUMP;

	pub fn update(&mut self, result: VotingResult) -> Result<()> {
		require!(self.result != result, ErrorCode::NothingChanged);
		self.result = result;
		Ok(())
	}
}

#[derive(Accounts)]
pub struct Vote<'info> {
	#[account(init, payer = user, space = Voting::LEN, seeds = [b"voting", user.key().as_ref()], bump)]
	pub voting: Account<'info, Voting>,
	pub system_program: Program<'info, System>,
	#[account(mut)]
	pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateVoting<'info> {
	pub user: Signer<'info>,
	#[account(mut, seeds = [b"voting", user.key().as_ref()], bump = voting.bump)]
	pub voting: Account<'info, Voting>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VotingResult {
	Like,
	NoVoting,
	Dislike,
}
