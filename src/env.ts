export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  GOOGLE_AI_API_KEY?: string;
  GEMINI_MODEL: string;
  GEMINI_FALLBACK_MODEL: string;
  JIRA_BASE_URL?: string;
  JIRA_EMAIL?: string;
  JIRA_API_TOKEN?: string;
  JIRA_PROJECT_IT?: string;
  JIRA_PROJECT_ENGINEERING?: string;
  JIRA_ISSUE_TYPE?: string;
  /** Shared secret for the Forge Jira app (X-Intake-Secret header). */
  JIRA_APP_SECRET?: string;
}
