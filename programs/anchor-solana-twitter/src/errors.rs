use anchor_lang::error_code;

#[error_code]
pub enum ErrorCode {
	#[msg("Exceeding maximum tag length of 50 characters")]
	TagTooLong,
	#[msg("Trying to send a tweet without content")]
	NoContent,
	#[msg("Exceeding maximum content length of 280 characters")]
	ContentTooLong,
	#[msg("No changes detected. Nothing that could be updated")]
	NothingChanged,
	#[msg("Trying to send an invalid vote")]
	InvalidVote, // NOTE: currently unused
	#[msg("An alias for this user is already registered")]
	AliasPresent,
	#[msg("Exceeding maximum tag length of 50 characters.")]
	AliasTooLong,
}
