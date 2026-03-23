create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  username text unique not null,
  avatar_url text,
  high_score integer not null default 0,
  bio text default '',
  status_text text default '',
  last_active_at timestamptz default now(),
  theme text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.desktop_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  wallpaper_url text default '',
  icon_positions jsonb not null default '[]'::jsonb,
  theme text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.desktop_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  filename text not null,
  file_type text not null check (file_type in ('text', 'code', 'note')),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storage_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  filename text not null,
  file_type text not null check (file_type in ('photo', 'txt', 'song')),
  file_url text not null,
  size integer,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  attachment_url text,
  attachment_type text check (attachment_type in ('photo', 'song')),
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read')),
  created_at timestamptz not null default now()
);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  check (user_id <> friend_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('message', 'friend_request', 'system')),
  title text not null,
  message text not null,
  read boolean not null default false,
  action_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recycle_bin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_table text not null check (source_table in ('desktop_files', 'storage_files')),
  item_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_comment_id uuid references public.post_comments (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.desktop_state add column if not exists created_at timestamptz not null default now();
alter table public.desktop_state add column if not exists updated_at timestamptz not null default now();
alter table public.desktop_files add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists status_text text default '';
alter table public.profiles add column if not exists last_active_at timestamptz default now();
alter table public.profiles add column if not exists theme text not null default 'light';
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_type text;
alter table public.storage_files drop constraint if exists storage_files_file_type_check;
alter table public.storage_files
  add constraint storage_files_file_type_check
  check (file_type in ('photo', 'txt', 'song'));
alter table public.messages drop constraint if exists messages_attachment_type_check;
alter table public.messages
  add constraint messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('photo', 'song'));

with duplicate_desktop_state as (
  select
    id,
    row_number() over (partition by user_id order by updated_at desc nulls last, created_at desc nulls last, id desc) as row_num
  from public.desktop_state
)
delete from public.desktop_state
where id in (
  select id from duplicate_desktop_state where row_num > 1
);

with ranked_friends as (
  select
    id,
    row_number() over (
      partition by least(user_id, friend_id), greatest(user_id, friend_id)
      order by
        case status
          when 'accepted' then 1
          when 'pending' then 2
          when 'blocked' then 3
          else 4
        end,
        created_at desc,
        id desc
    ) as row_num
  from public.friends
)
delete from public.friends
where id in (
  select id
  from ranked_friends
  where row_num > 1
);

create unique index if not exists desktop_state_user_id_key on public.desktop_state (user_id);
create unique index if not exists friends_unique_pair_idx
  on public.friends (least(user_id, friend_id), greatest(user_id, friend_id));
create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_messages_receiver_id on public.messages (receiver_id);
create index if not exists idx_messages_created_at on public.messages (created_at desc);
create index if not exists idx_friends_user_id on public.friends (user_id);
create index if not exists idx_friends_friend_id on public.friends (friend_id);
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_read on public.notifications (read);
create index if not exists idx_desktop_files_user_id on public.desktop_files (user_id);
create index if not exists idx_storage_files_user_id on public.storage_files (user_id);
create index if not exists idx_game_scores_user_id on public.game_scores (user_id);
create index if not exists idx_recycle_bin_user_id on public.recycle_bin (user_id);
create index if not exists idx_social_posts_user_id on public.social_posts (user_id);
create index if not exists idx_post_comments_post_id on public.post_comments (post_id);
create index if not exists idx_post_likes_post_id on public.post_likes (post_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_username text;
begin
  resolved_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1),
    'user'
  );

  insert into public.profiles (id, email, username, avatar_url, high_score)
  values (
    new.id,
    new.email,
    resolved_username,
    format(
      'https://api.dicebear.com/7.x/avataaars/svg?seed=%s',
      replace(resolved_username, ' ', '%20')
    ),
    0
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  insert into public.desktop_state (user_id, wallpaper_url, theme, icon_positions)
  values (new.id, '', 'light', '[]'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select username into requester_name
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (user_id, type, title, message, action_id)
  values (
    new.friend_id,
    'friend_request',
    'New friend request',
    coalesce(requester_name, 'Someone') || ' sent you a friend request.',
    new.id
  );

  return new;
end;
$$;

create or replace function public.notify_friend_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  accepter_name text;
begin
  if new.status <> 'accepted' or old.status = 'accepted' then
    return new;
  end if;

  select username into accepter_name
  from public.profiles
  where id = new.friend_id;

  insert into public.notifications (user_id, type, title, message, action_id)
  values (
    new.user_id,
    'system',
    'Friend request accepted',
    coalesce(accepter_name, 'Someone') || ' accepted your friend request.',
    new.id
  );

  return new;
end;
$$;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
begin
  select username into sender_name
  from public.profiles
  where id = new.sender_id;

  insert into public.notifications (user_id, type, title, message, action_id)
  values (
    new.receiver_id,
    'message',
    coalesce(sender_name, 'Someone') || ' sent a message',
    left(new.content, 140),
    new.id
  );

  return new;
end;
$$;

create or replace function public.notify_social_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, action_id)
  select
    friendship.friend_id,
    'system',
    'New Nova Feed post',
    coalesce(author.username, 'Someone') || ' posted to Nova Feed.',
    new.id
  from public.friends friendship
  join public.profiles author on author.id = new.user_id
  where friendship.user_id = new.user_id
    and friendship.status = 'accepted';

  insert into public.notifications (user_id, type, title, message, action_id)
  select
    friendship.user_id,
    'system',
    'New Nova Feed post',
    coalesce(author.username, 'Someone') || ' posted to Nova Feed.',
    new.id
  from public.friends friendship
  join public.profiles author on author.id = new.user_id
  where friendship.friend_id = new.user_id
    and friendship.status = 'accepted';

  return new;
end;
$$;

create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  liker_name text;
  target_user_id uuid;
begin
  select username into liker_name
  from public.profiles
  where id = new.user_id;

  select user_id into target_user_id
  from public.social_posts
  where id = new.post_id;

  if target_user_id is null or target_user_id = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, message, action_id)
  values (
    target_user_id,
    'system',
    'New like on your post',
    coalesce(liker_name, 'Someone') || ' liked your post.',
    new.post_id
  );

  return new;
end;
$$;

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  commenter_name text;
  target_user_id uuid;
begin
  select username into commenter_name
  from public.profiles
  where id = new.user_id;

  if new.parent_comment_id is not null then
    select user_id into target_user_id
    from public.post_comments
    where id = new.parent_comment_id;
  else
    select user_id into target_user_id
    from public.social_posts
    where id = new.post_id;
  end if;

  if target_user_id is null or target_user_id = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, message, action_id)
  values (
    target_user_id,
    'system',
    case when new.parent_comment_id is null then 'New comment on your post' else 'New reply to your comment' end,
    case when new.parent_comment_id is null
      then coalesce(commenter_name, 'Someone') || ' commented on your post.'
      else coalesce(commenter_name, 'Someone') || ' replied to your comment.'
    end,
    new.post_id
  );

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_desktop_state_updated_at on public.desktop_state;
create trigger set_desktop_state_updated_at
before update on public.desktop_state
for each row
execute function public.set_updated_at();

drop trigger if exists set_desktop_files_updated_at on public.desktop_files;
create trigger set_desktop_files_updated_at
before update on public.desktop_files
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists on_friend_request_created on public.friends;
create trigger on_friend_request_created
after insert on public.friends
for each row
execute function public.notify_friend_request();

drop trigger if exists on_friend_request_accepted on public.friends;
create trigger on_friend_request_accepted
after update on public.friends
for each row
execute function public.notify_friend_acceptance();

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
after insert on public.messages
for each row
execute function public.notify_new_message();

drop trigger if exists on_social_post_created on public.social_posts;
create trigger on_social_post_created
after insert on public.social_posts
for each row
execute function public.notify_social_post();

drop trigger if exists on_post_like_created on public.post_likes;
create trigger on_post_like_created
after insert on public.post_likes
for each row
execute function public.notify_post_like();

drop trigger if exists on_post_comment_created on public.post_comments;
create trigger on_post_comment_created
after insert on public.post_comments
for each row
execute function public.notify_post_comment();

alter table public.profiles enable row level security;
alter table public.desktop_state enable row level security;
alter table public.desktop_files enable row level security;
alter table public.storage_files enable row level security;
alter table public.messages enable row level security;
alter table public.friends enable row level security;
alter table public.notifications enable row level security;
alter table public.game_scores enable row level security;
alter table public.recycle_bin enable row level security;
alter table public.social_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_authenticated'
  ) then
    create policy profiles_select_authenticated
      on public.profiles
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'desktop_state' and policyname = 'desktop_state_select_own'
  ) then
    create policy desktop_state_select_own
      on public.desktop_state
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'desktop_state' and policyname = 'desktop_state_insert_own'
  ) then
    create policy desktop_state_insert_own
      on public.desktop_state
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'desktop_state' and policyname = 'desktop_state_update_own'
  ) then
    create policy desktop_state_update_own
      on public.desktop_state
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'desktop_files' and policyname = 'desktop_files_select_own'
  ) then
    create policy desktop_files_select_own
      on public.desktop_files
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'desktop_files' and policyname = 'desktop_files_insert_own'
  ) then
    create policy desktop_files_insert_own
      on public.desktop_files
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'desktop_files' and policyname = 'desktop_files_update_own'
  ) then
    create policy desktop_files_update_own
      on public.desktop_files
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'desktop_files' and policyname = 'desktop_files_delete_own'
  ) then
    create policy desktop_files_delete_own
      on public.desktop_files
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'storage_files' and policyname = 'storage_files_select_own'
  ) then
    create policy storage_files_select_own
      on public.storage_files
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'storage_files' and policyname = 'storage_files_insert_own'
  ) then
    create policy storage_files_insert_own
      on public.storage_files
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'storage_files' and policyname = 'storage_files_delete_own'
  ) then
    create policy storage_files_delete_own
      on public.storage_files
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'storage_files' and policyname = 'storage_files_update_own'
  ) then
    create policy storage_files_update_own
      on public.storage_files
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_select_participants'
  ) then
    create policy messages_select_participants
      on public.messages
      for select
      using (auth.uid() = sender_id or auth.uid() = receiver_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_insert_sender'
  ) then
    create policy messages_insert_sender
      on public.messages
      for insert
      with check (auth.uid() = sender_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friends' and policyname = 'friends_select_participants'
  ) then
    create policy friends_select_participants
      on public.friends
      for select
      using (auth.uid() = user_id or auth.uid() = friend_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friends' and policyname = 'friends_insert_sender'
  ) then
    create policy friends_insert_sender
      on public.friends
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friends' and policyname = 'friends_update_participants'
  ) then
    create policy friends_update_participants
      on public.friends
      for update
      using (auth.uid() = user_id or auth.uid() = friend_id)
      with check (auth.uid() = user_id or auth.uid() = friend_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'friends' and policyname = 'friends_delete_participants'
  ) then
    create policy friends_delete_participants
      on public.friends
      for delete
      using (auth.uid() = user_id or auth.uid() = friend_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own
      on public.notifications
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own
      on public.notifications
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_delete_own'
  ) then
    create policy notifications_delete_own
      on public.notifications
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_scores' and policyname = 'game_scores_select_own'
  ) then
    create policy game_scores_select_own
      on public.game_scores
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_scores' and policyname = 'game_scores_insert_own'
  ) then
    create policy game_scores_insert_own
      on public.game_scores
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recycle_bin' and policyname = 'recycle_bin_select_own'
  ) then
    create policy recycle_bin_select_own
      on public.recycle_bin
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recycle_bin' and policyname = 'recycle_bin_insert_own'
  ) then
    create policy recycle_bin_insert_own
      on public.recycle_bin
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recycle_bin' and policyname = 'recycle_bin_delete_own'
  ) then
    create policy recycle_bin_delete_own
      on public.recycle_bin
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'social_posts' and policyname = 'social_posts_select_authenticated'
  ) then
    create policy social_posts_select_authenticated
      on public.social_posts
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'social_posts' and policyname = 'social_posts_insert_own'
  ) then
    create policy social_posts_insert_own
      on public.social_posts
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'social_posts' and policyname = 'social_posts_update_own'
  ) then
    create policy social_posts_update_own
      on public.social_posts
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'social_posts' and policyname = 'social_posts_delete_own'
  ) then
    create policy social_posts_delete_own
      on public.social_posts
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_likes' and policyname = 'post_likes_select_authenticated'
  ) then
    create policy post_likes_select_authenticated
      on public.post_likes
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_likes' and policyname = 'post_likes_insert_own'
  ) then
    create policy post_likes_insert_own
      on public.post_likes
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_likes' and policyname = 'post_likes_delete_own'
  ) then
    create policy post_likes_delete_own
      on public.post_likes
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_comments' and policyname = 'post_comments_select_authenticated'
  ) then
    create policy post_comments_select_authenticated
      on public.post_comments
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_comments' and policyname = 'post_comments_insert_own'
  ) then
    create policy post_comments_insert_own
      on public.post_comments
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_comments' and policyname = 'post_comments_update_own'
  ) then
    create policy post_comments_update_own
      on public.post_comments
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_comments' and policyname = 'post_comments_delete_own'
  ) then
    create policy post_comments_delete_own
      on public.post_comments
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_user_files_insert'
  ) then
    create policy storage_user_files_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'user-files'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_user_files_select'
  ) then
    create policy storage_user_files_select
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'user-files'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_user_files_delete'
  ) then
    create policy storage_user_files_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'user-files'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friends'
  ) then
    execute 'alter publication supabase_realtime add table public.friends';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_posts'
  ) then
    execute 'alter publication supabase_realtime add table public.social_posts';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_likes'
  ) then
    execute 'alter publication supabase_realtime add table public.post_likes';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'post_comments'
  ) then
    execute 'alter publication supabase_realtime add table public.post_comments';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'recycle_bin'
  ) then
    execute 'alter publication supabase_realtime add table public.recycle_bin';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'storage_files'
  ) then
    execute 'alter publication supabase_realtime add table public.storage_files';
  end if;
end
$$;
