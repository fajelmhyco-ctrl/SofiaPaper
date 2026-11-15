-- Run once in the Supabase SQL editor. No secret key is used in the browser.
create table if not exists public.student_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  attempt_id text not null,
  student_name text not null default '',
  section text not null default '',
  station integer not null check (station between 1 and 5),
  question_id text not null,
  question text not null check (length(question) between 1 and 4000),
  selected_id text not null default '',
  selected_answer text not null check (length(selected_answer) <= 4000),
  kind text not null check (kind in ('quiz', 'reflection', 'insight')),
  started_at timestamptz not null default now(),
  answered_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  admin_edited boolean not null default false,
  unique (attempt_id, question_id)
);
create index if not exists student_answers_user on public.student_answers(user_id);
create index if not exists student_answers_updated on public.student_answers(updated_at);

-- Deletion receipts prevent a delayed retry from recreating an admin-deleted answer.
create table if not exists public.answer_deletions (
  attempt_id text not null,
  question_id text not null,
  primary key (attempt_id, question_id)
);
alter table public.student_answers enable row level security;
alter table public.answer_deletions enable row level security;
revoke all on public.student_answers, public.answer_deletions from anon, authenticated;
grant select, insert, update, delete on public.student_answers to authenticated;
drop policy if exists admin_answers on public.student_answers;
create policy admin_answers on public.student_answers for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.remember_answer_deletion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.answer_deletions values (old.attempt_id, old.question_id) on conflict do nothing;
  return old;
end;
$$;
revoke all on function public.remember_answer_deletion() from public;
drop trigger if exists remember_answer_deletion on public.student_answers;
create trigger remember_answer_deletion after delete on public.student_answers
  for each row execute function public.remember_answer_deletion();

create or replace function public.stamp_answer_update() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists stamp_answer_update on public.student_answers;
create trigger stamp_answer_update before update on public.student_answers
  for each row execute function public.stamp_answer_update();

-- Students may submit their own responses, but cannot read the class, edit an
-- admin correction, or delete anything. The RPC is the only student write path.
create or replace function public.submit_student_answer(payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  attempt text := payload ->> 'attempt_id';
  question_key text := payload ->> 'question_id';
begin
  if caller is null then raise exception 'Sign-in required'; end if;
  if length(attempt) not between 1 and 150 or length(question_key) not between 1 and 150
    or attempt is null or question_key is null then raise exception 'Invalid identifier'; end if;
  if length(coalesce(payload ->> 'student_name', '')) > 80
    or length(coalesce(payload ->> 'section', '')) > 60 then raise exception 'Invalid student profile'; end if;
  -- Serialize writes for an attempt, including first submissions.
  perform pg_advisory_xact_lock(hashtextextended(attempt, 0));
  if exists (select 1 from public.student_answers where attempt_id = attempt and user_id is distinct from caller)
    then raise exception 'Attempt belongs to another user'; end if;
  if exists (select 1 from public.answer_deletions where attempt_id = attempt and question_id = question_key)
    then return; end if;
  insert into public.student_answers (
    user_id, attempt_id, student_name, section, station, question_id, question,
    selected_id, selected_answer, kind, started_at, answered_at
  ) values (
    caller, attempt, coalesce(payload ->> 'student_name', ''), coalesce(payload ->> 'section', ''),
    (payload ->> 'station')::integer, question_key, payload ->> 'question',
    coalesce(payload ->> 'selected_id', ''), coalesce(payload ->> 'selected_answer', ''),
    payload ->> 'kind', (payload ->> 'started_at')::timestamptz, (payload ->> 'answered_at')::timestamptz
  ) on conflict (attempt_id, question_id) do update set
    student_name = excluded.student_name,
    section = excluded.section,
    selected_id = case when student_answers.kind = 'quiz' then student_answers.selected_id else excluded.selected_id end,
    selected_answer = case when student_answers.kind = 'quiz' then student_answers.selected_answer else excluded.selected_answer end,
    answered_at = greatest(student_answers.answered_at, excluded.answered_at)
  where student_answers.user_id = caller and not student_answers.admin_edited
    and excluded.answered_at >= student_answers.answered_at;
end;
$$;
revoke all on function public.submit_student_answer(jsonb) from public, anon;
grant execute on function public.submit_student_answer(jsonb) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'student_answers') then
    alter publication supabase_realtime add table public.student_answers;
  end if;
end $$;
