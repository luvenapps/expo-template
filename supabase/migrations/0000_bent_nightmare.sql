CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "habit_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"date" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'local' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cadence" text NOT NULL,
	"color" text DEFAULT '#0ea5e9' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"time_local" text NOT NULL,
	"days_of_week" text NOT NULL,
	"timezone" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "habit_entries" ADD CONSTRAINT "habit_entries_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "devices_user_id_platform_idx" ON "devices" USING btree ("user_id","platform");--> statement-breakpoint
CREATE UNIQUE INDEX "habit_entries_habit_id_date_unique" ON "habit_entries" USING btree ("habit_id","date") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "habit_entries_user_habit_id_date_idx" ON "habit_entries" USING btree ("user_id","habit_id","date");--> statement-breakpoint
CREATE INDEX "habits_user_id_updated_at_idx" ON "habits" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "reminders_user_habit_id_enabled_idx" ON "reminders" USING btree ("user_id","habit_id","is_enabled");

-- Row Level Security (RLS) Policies
-- This file is auto-generated from DOMAIN config
-- DO NOT EDIT MANUALLY - regenerate with: npm run db:generate-rls
-- Apply this after running the Drizzle migration

-- Enable RLS on all tables
alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.reminders enable row level security;
alter table public.devices enable row level security;

-- Drop existing policies if they exist (for re-running)
drop policy if exists "Users can manage their own habits" on public.habits;
drop policy if exists "Users can manage their own habit_entries" on public.habit_entries;
drop policy if exists "Users can manage their own reminders" on public.reminders;
drop policy if exists "Users can manage their own devices" on public.devices;

-- Create policies for each table
create policy "Users can manage their own habits"
  on public.habits
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own habit_entries"
  on public.habit_entries
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own reminders"
  on public.reminders
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own devices"
  on public.devices
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

