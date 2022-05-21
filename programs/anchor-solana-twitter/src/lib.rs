use anchor_lang::prelude::*;
use state::*;

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod anchor_solana_twitter {
	use super::*;

	pub fn send_tweet(ctx: Context<SendTweet>, tag: String, content: String) -> Result<()> {
		instructions::tweet::send_tweet(ctx, tag, content)
	}

	pub fn update_tweet(
		ctx: Context<UpdateTweet>,
		new_tag: String,
		new_content: String,
	) -> Result<()> {
		instructions::tweet::update_tweet(ctx, new_tag, new_content)
	}

	pub fn send_comment(
		ctx: Context<SendComment>,
		tweet: Pubkey,
		content: String,
		parent: Option<Pubkey>,
	) -> Result<()> {
		instructions::comment::send_comment(ctx, tweet, content, parent)
	}

	pub fn update_comment(ctx: Context<UpdateComment>, new_content: String) -> Result<()> {
		instructions::comment::update_comment(ctx, new_content)
	}

	pub fn vote(ctx: Context<Vote>, tweet: Pubkey, result: VotingResult) -> Result<()> {
        instructions::voting::vote(ctx, tweet, result)
	}

	pub fn update_voting(ctx: Context<UpdateVoting>, new_result: VotingResult) -> Result<()> {
		instructions::update_voting(ctx, new_result)
	}

	pub fn send_dm(ctx: Context<SendDm>, recipient: Pubkey, content: String) -> Result<()> {
        instructions::send_dm(ctx, recipient, content)
	}

	pub fn create_alias(ctx: Context<CreateUserAlias>, alias: String) -> Result<()> {
        instructions::create_alias(ctx, alias)
	}

	pub fn update_user_alias(ctx: Context<UpdateUserAlias>, new_alias: String) -> Result<()> {
		instructions::update_user_alias(ctx, new_alias)
	}
}
