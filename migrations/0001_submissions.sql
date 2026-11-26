-- One row per submitted ticket. NULL in *_valid means unknown (AI check did not run), never "valid".
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  department TEXT NOT NULL,
  summary TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  checks INTEGER NOT NULL,
  first_valid INTEGER,
  final_valid INTEGER,
  missing_json TEXT NOT NULL,
  ai_model TEXT,
  jira_mode TEXT NOT NULL CHECK (jira_mode IN ('jira', 'demo')),
  jira_key TEXT,
  jira_created_at TEXT,
  jira_resolved_at TEXT,
  jira_synced_at TEXT
);

CREATE INDEX submissions_created_at ON submissions (created_at);
