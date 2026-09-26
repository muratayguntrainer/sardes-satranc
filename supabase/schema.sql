-- Sardes Satranç — Supabase şeması
-- Bu dosyayı Supabase Dashboard -> SQL Editor içine yapıştırıp çalıştır.

-- 1) Üye profilleri tablosu
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  games_played integer not null default 0,
  puzzles_solved integer not null default 0,
  highest_puzzle_level integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2) Yeni kullanıcı kayıt olduğunda otomatik profil satırı oluştur
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) Satır Düzeyi Güvenlik (RLS): herkes profilleri okuyabilir
--    (liderlik tablosu için gerekli), ama sadece kendi profilini güncelleyebilir.
alter table public.profiles enable row level security;

create policy "Profiller herkese açık okunabilir"
  on public.profiles for select
  using (true);

create policy "Kullanıcı sadece kendi profilini güncelleyebilir"
  on public.profiles for update
  using (auth.uid() = id);

-- 4) Üyeler arası online oyunlar
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  white_id uuid references public.profiles(id) on delete set null,
  black_id uuid references public.profiles(id) on delete set null,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  status text not null default 'waiting' check (status in ('waiting','active','finished')),
  result text, -- 'white' | 'black' | 'draw' | null
  last_move jsonb,
  move_count integer not null default 0,
  time_control_minutes integer not null default 10, -- 0 = süresiz
  white_time_ms bigint not null default 600000,
  black_time_ms bigint not null default 600000,
  turn_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daha önce oluşturulmuş bir games tablosu varsa zaman kontrolü sütunlarını ekle
alter table public.games add column if not exists time_control_minutes integer not null default 10;
alter table public.games add column if not exists white_time_ms bigint not null default 600000;
alter table public.games add column if not exists black_time_ms bigint not null default 600000;
alter table public.games add column if not exists turn_started_at timestamptz not null default now();

alter table public.games enable row level security;

drop policy if exists "Oyunları katılımcılar ve bekleyenler görebilir" on public.games;
create policy "Oyunları katılımcılar ve bekleyenler görebilir"
  on public.games for select
  using (status = 'waiting' or auth.uid() = white_id or auth.uid() = black_id);

drop policy if exists "Giriş yapan herkes oyun açabilir" on public.games;
create policy "Giriş yapan herkes oyun açabilir"
  on public.games for insert
  with check (auth.uid() = white_id);

drop policy if exists "Katılımcılar hamle için güncelleyebilir" on public.games;
create policy "Katılımcılar hamle için güncelleyebilir"
  on public.games for update
  using (auth.uid() = white_id or auth.uid() = black_id);

drop policy if exists "Bekleyen oyuna herkes katılabilir" on public.games;
create policy "Bekleyen oyuna herkes katılabilir"
  on public.games for update
  using (status = 'waiting' and black_id is null and white_id <> auth.uid())
  with check (black_id = auth.uid());

-- Realtime: hamleler anında karşı tarafa ulaşsın diye bu tabloyu yayına ekle.
-- (Alternatif: Supabase Dashboard -> Database -> Replication -> games tablosunu aç.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;
