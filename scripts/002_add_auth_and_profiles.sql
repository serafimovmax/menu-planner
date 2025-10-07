-- Create profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  created_at timestamp with time zone default now()
);

-- Add user_id to recipes table
alter table recipes add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Add user_id to meal_plans table
alter table meal_plans add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Create indexes for user_id columns
create index if not exists recipes_user_id_idx on recipes(user_id);
create index if not exists meal_plans_user_id_idx on meal_plans(user_id);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Update recipes policies to filter by user_id
drop policy if exists "Anyone can view recipes" on recipes;
drop policy if exists "Anyone can insert recipes" on recipes;
drop policy if exists "Anyone can update recipes" on recipes;
drop policy if exists "Anyone can delete recipes" on recipes;

create policy "Users can view their own recipes"
  on recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recipes"
  on recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recipes"
  on recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own recipes"
  on recipes for delete
  using (auth.uid() = user_id);

-- Update meal_plans policies to filter by user_id
drop policy if exists "Anyone can view meal plans" on meal_plans;
drop policy if exists "Anyone can insert meal plans" on meal_plans;
drop policy if exists "Anyone can update meal plans" on meal_plans;
drop policy if exists "Anyone can delete meal plans" on meal_plans;

create policy "Users can view their own meal plans"
  on meal_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meal plans"
  on meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meal plans"
  on meal_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meal plans"
  on meal_plans for delete
  using (auth.uid() = user_id);

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
