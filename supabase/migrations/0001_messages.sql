-- Messaging schema and policies for Stage 9

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  cta_label text,
  cta_url text,
  audience text not null default 'public',
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
--> statement-breakpoint
create index if not exists messages_audience_published_idx
  on public.messages (audience, published_at desc);
--> statement-breakpoint
create index if not exists messages_expires_at_idx
  on public.messages (expires_at);
--> statement-breakpoint
alter table public.messages enable row level security;
--> statement-breakpoint
drop policy if exists "Messages audience read access" on public.messages;
--> statement-breakpoint
create policy "Messages audience read access"
  on public.messages
  for select
  using (
    audience = 'public'
    or (audience = 'authenticated' and auth.role() = 'authenticated')
    or (
      audience like 'user:%'
      and nullif(split_part(audience, ':', 2), '')::uuid = auth.uid()
    )
  );
