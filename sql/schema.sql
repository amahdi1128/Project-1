-- Optional waitlist storage for Cloudflare D1 (Free plan). Configure binding name DB in Cloudflare Pages.
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  trade TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
