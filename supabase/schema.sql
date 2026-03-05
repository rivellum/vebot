-- VeBot chat sessions log
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  session_id text unique not null,
  site_id text not null,
  message_count integer default 1,
  last_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for analytics queries
create index if not exists chat_sessions_site_id_idx on chat_sessions(site_id);
create index if not exists chat_sessions_updated_at_idx on chat_sessions(updated_at);
