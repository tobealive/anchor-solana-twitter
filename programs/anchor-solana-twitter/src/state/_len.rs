pub const DISCRIMINATOR: usize = 8;
pub const PUBLIC_KEY: usize = 32;
pub const TIMESTAMP: usize = 8;
pub const STRING_LENGTH: usize = 4; // Prefix stores size of the string
pub const TAG_MAX: usize = 50 * 4; // 50 chars max
pub const CONTENT_MAX: usize = 280 * 4; // 280  chars max
pub const ALIAS_MAX: usize = 50 * 4;
pub const EDITED: usize = 1; // bool
pub const VOTING_RESULT: usize = 1; // enum
pub const BUMP: usize = 1; // enum

