create table if not exists public.email_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_otps_email_created_at_idx
  on public.email_otps (email, created_at desc);

create index if not exists email_otps_user_id_created_at_idx
  on public.email_otps (user_id, created_at desc);

alter table public.email_otps enable row level security;

revoke all on table public.email_otps from anon, authenticated;
grant all on table public.email_otps to service_role;

create or replace function public.consume_email_otp(
  candidate_email text,
  candidate_hash text,
  candidate_max_attempts integer default 5,
  candidate_max_total_attempts integer default 20,
  candidate_window_minutes integer default 15
)
returns table (status text, user_id uuid, attempts_remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  otp public.email_otps%rowtype;
  normalized_email text;
  recent_attempts integer;
  next_attempts integer;
  max_attempts integer;
begin
  normalized_email := lower(btrim(coalesce(candidate_email, '')));
  max_attempts := greatest(coalesce(candidate_max_attempts, 5), 1);

  if normalized_email = '' or coalesce(candidate_hash, '') = '' then
    return query select 'expired'::text, null::uuid, 0;
    return;
  end if;

  select coalesce(sum(o.attempts), 0)
  into recent_attempts
  from public.email_otps o
  where o.email = normalized_email
    and o.created_at >= now() - make_interval(
      mins => greatest(coalesce(candidate_window_minutes, 15), 1)
    );

  if recent_attempts >= greatest(coalesce(candidate_max_total_attempts, 20), 1) then
    return query select 'locked'::text, null::uuid, 0;
    return;
  end if;

  select *
  into otp
  from public.email_otps
  where email = normalized_email
  order by created_at desc
  limit 1
  for update;

  if not found then
    return query select 'expired'::text, null::uuid, 0;
    return;
  end if;

  if otp.consumed_at is not null or otp.expires_at <= now() then
    return query select 'expired'::text, otp.user_id, 0;
    return;
  end if;

  if otp.attempts >= max_attempts then
    return query select 'locked'::text, otp.user_id, 0;
    return;
  end if;

  if otp.code_hash <> candidate_hash then
    next_attempts := otp.attempts + 1;

    update public.email_otps
      set attempts = next_attempts
      where id = otp.id;

    return query select
      case when next_attempts >= max_attempts then 'locked' else 'invalid' end,
      otp.user_id,
      greatest(max_attempts - next_attempts, 0);
    return;
  end if;

  update public.email_otps
    set consumed_at = now()
    where id = otp.id;

  return query select 'ok'::text, otp.user_id, 0;
end;
$$;

revoke all on function public.consume_email_otp(text, text, integer, integer, integer) from public;
revoke all on function public.consume_email_otp(text, text, integer, integer, integer) from anon, authenticated;
grant execute on function public.consume_email_otp(text, text, integer, integer, integer) to service_role;

create or replace function public.get_user_id_by_email(candidate_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from auth.users
  where lower(email) = lower(btrim(coalesce(candidate_email, '')))
  limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
revoke all on function public.get_user_id_by_email(text) from anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
