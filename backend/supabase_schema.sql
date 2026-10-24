-- Run this SQL in Supabase Dashboard > SQL Editor.
-- Do not put your service-role key in frontend files.
create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null default '',
  course text not null,
  message text not null default '',
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

-- All student writes/reads are made by the server using the service-role key.
-- Do not create public SELECT/UPDATE/DELETE policies for the service-role workflow.
