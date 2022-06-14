use anchor_lang::prelude::*;

#[account]
pub struct Voting {
	pub user: Pubkey,
	pub tweet: Pubkey,
	pub timestamp: i64,
	pub result: VotingResult,
	pub bump: u8,
}

#[derive(Accounts)]
#[instruction(tweet: Pubkey)]
pub struct Vote<'info> {
	#[account(init, 
        payer = user, 
        // 8 discriminator + 32 user + 32 tweet + 8 timestamp + 1 voting result + 1 bump
        space = 8 + 32 + 32 + 8 + 1 + 1, 
        seeds = [b"voting", user.key().as_ref(), tweet.key().as_ref()], 
        bump)]
	pub voting: Account<'info, Voting>,
	pub system_program: Program<'info, System>,
	#[account(mut)]
	pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateVoting<'info> {
	pub user: Signer<'info>,
	#[account(mut,
        seeds = [b"voting", user.key().as_ref(), voting.tweet.key().as_ref()], 
        bump = voting.bump)]
	pub voting: Account<'info, Voting>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VotingResult {
	Like,
	NoVoting,
	Dislike,
}
