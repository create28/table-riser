-- Create table for storing algorithm weights
create table if not exists fpl_weights (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  form_weight numeric not null,
  fixture_weight numeric not null,
  ict_weight numeric not null,
  price_weight numeric not null,
  active boolean default true
);

-- Create table for storing transfer decisions
create table if not exists fpl_decisions (
  id text primary key, -- using text to match the UUIDs we generate client-side or we can switch to uuid
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  gameweek integer not null,
  team_id integer,
  player_out_id integer not null,
  player_in_id integer not null,
  player_out_name text,
  player_in_name text,
  reasoning jsonb, -- store the weights used at the time
  status text default 'pending' -- pending, evaluated
);

-- Create table for storing outcomes
create table if not exists fpl_outcomes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  decision_id text references fpl_decisions(id),
  actual_points_gained numeric not null,
  weeks_evaluated integer not null,
  success_score numeric not null
);

-- Enable Row Level Security (RLS)
alter table fpl_weights enable row level security;
alter table fpl_decisions enable row level security;
alter table fpl_outcomes enable row level security;

-- Create policies (for now, allow public access since we are using anon key for a single user app)
-- In a real multi-user app, we'd restrict this.
create policy "Allow public read access" on fpl_weights for select using (true);
create policy "Allow public insert access" on fpl_weights for insert with check (true);

create policy "Allow public read access" on fpl_decisions for select using (true);
create policy "Allow public insert access" on fpl_decisions for insert with check (true);
create policy "Allow public update access" on fpl_decisions for update using (true);

create policy "Allow public read access" on fpl_outcomes for select using (true);
create policy "Allow public insert access" on fpl_outcomes for insert with check (true);
