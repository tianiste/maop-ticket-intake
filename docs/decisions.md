# Decisions

Why things are the way they are. Architecture decisions are presented to the owner first
(options, trade-offs, recommendation) and recorded here once the owner has chosen.
Newest first.

## 2026-11-26: AI validation runs in a Cloudflare Worker, code checks plus AI

- **Context:** The form needs a completeness check against MAOP's rules before a Jira ticket is
  created. The Gemini key must not reach the browser, so a server part is needed.
- **Options:**
  1. Cloudflare Worker (TypeScript): free hosting, key as a Worker secret; deploying needs the owner.
  2. Node + TypeScript server: simple locally, needs its own hosting.
  3. Python + FastAPI: same amount of code, separate stack from a later web form.
- **Recommended:** Node + TypeScript.
- **Chosen by the owner:** Cloudflare Worker.
- **Also chosen:** response is `valid` + what is missing + follow-up questions; empty required
  fields are checked in code, content rules are judged by the AI; rules are sample rules until
  MAOP provides examples of complete and incomplete tickets.
- **Consequences:** One endpoint `POST /validate` in `src/index.ts`; rules live in `src/rules.ts`
  and are described in `docs/rules.md`. If the AI fails, the result is `valid: null` (unknown),
  never valid. Revisit if Worker limits or Gemini latency make the form too slow.

## {{YYYY-MM-DD}}: {{decision title}}

- **Context:** {{the problem and the constraints}}
- **Options:**
  1. {{option}}: {{pros / cons}}
  2. {{option}}: {{pros / cons}}
- **Recommended:** {{option and why}}
- **Chosen by the owner:** {{option}}
- **Consequences:** {{what this commits us to; what would make us revisit it}}
