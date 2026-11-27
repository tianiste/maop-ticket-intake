-- Tickets created in Jira through the Forge app (jira-app/) have no known number of checks or
-- first-check result: checks may now be NULL (unknown, never 0). source tells the web form and the
-- Jira app apart. A Jira key is stored once, so a repeated Jira event cannot count a ticket twice.
-- SQLite cannot drop NOT NULL in place, so the table is rebuilt; existing rows are web-form rows.
CREATE TABLE submissions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  department TEXT NOT NULL,
  summary TEXT NOT NULL,
  fields_json TEXT NOT NULL,
  checks INTEGER,
  first_valid INTEGER,
  final_valid INTEGER,
  missing_json TEXT NOT NULL,
  ai_model TEXT,
  jira_mode TEXT NOT NULL CHECK (jira_mode IN ('jira', 'demo')),
  jira_key TEXT,
  jira_created_at TEXT,
  jira_resolved_at TEXT,
  jira_synced_at TEXT,
  source TEXT NOT NULL DEFAULT 'form' CHECK (source IN ('form', 'jira'))
);

INSERT INTO submissions_new
  (id, created_at, department, summary, fields_json, checks, first_valid, final_valid, missing_json,
   ai_model, jira_mode, jira_key, jira_created_at, jira_resolved_at, jira_synced_at, source)
SELECT id, created_at, department, summary, fields_json, checks, first_valid, final_valid, missing_json,
       ai_model, jira_mode, jira_key, jira_created_at, jira_resolved_at, jira_synced_at, 'form'
FROM submissions;

DROP TABLE submissions;
ALTER TABLE submissions_new RENAME TO submissions;

CREATE INDEX submissions_created_at ON submissions (created_at);
CREATE UNIQUE INDEX submissions_jira_key ON submissions (jira_key) WHERE jira_key IS NOT NULL;
