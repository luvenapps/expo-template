# Better Habits Roadmap

This document tracks the state of the starter kit. Update it whenever a stage moves forward so new contributors can pick up the thread from any workspace.

## Stage Overview

| Stage                                | Status         | Notes                                                                                                                           |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1. Database & Persistence Foundation | ✅ Done        | SQLite + Drizzle schema, repository helpers, and tests are in place.                                                            |
| 2. Sync Infrastructure               | 🟡 In progress | Client side outbox + cursor sync flows exist; still need Supabase edge functions, migrations, and background scheduling polish. |
| 3. Authentication Shell              | ✅ Done        | Supabase client, session store, and optional login flow wired into settings.                                                    |
| 4. Core UI & Design System           | 🟡 In progress | Tamagui providers/components scaffolded; needs component polish, theme controls, and cross-platform tweaks.                     |
| 5. DevOps & Tooling                  | 🟡 In progress | Scripts/tests linting exist; documentation, EAS workflows, and templating finish work outstanding.                              |
| 6. Observability & Notifications     | 🟡 Started     | Notification helpers + tests shipped; analytics hooks and richer logging TBD.                                                   |
| 7. Domain-Specific Features          | ⬜ Not started | Habit detail charts, streak logic, reminders UX, data export, etc.                                                              |

## Active Focus

- Wire Supabase migrations + edge functions to complete the sync loop.
- Continue UI polish with domain-independent terminology driven by `DOMAIN`.
- Flesh out analytics/observability and notifications settings.

## Next Milestones

1. **Ship Supabase backend pieces** – SQL migrations, RLS policies, `sync-push`, `sync-pull`, and `export` edge functions.
2. **Hook CRUD flows into outbox** – ensure every local mutation enqueues sync records.
3. **Build Habit UX polish** – charts, streak counter, reminder scheduling UI, and data export entry points.
4. **Document deployment flows** – EAS build instructions, web export notes, and template guidance.

Keep this list lightweight: add links or notes as work lands so the team always has an up-to-date snapshot.\*\*\*
