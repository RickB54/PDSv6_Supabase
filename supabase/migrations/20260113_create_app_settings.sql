create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table app_settings enable row level security;

-- Allow public read so customers can check availability
create policy "Allow Public Read"
  on app_settings for select
  using (true);

-- Allow authenticated users (admins) to update
create policy "Allow Admin Update"
  on app_settings for insert
  with check (auth.role() = 'authenticated');

create policy "Allow Admin Update Existing"
  on app_settings for update
  using (auth.role() = 'authenticated');

-- Insert default calendar config if not exists
insert into app_settings (key, value)
values ('calendar_config', '{
    "clientId": "",
    "apiKey": "",
    "calendarIds": ["primary"],
    "maxBookingsPerDay": 1,
    "bufferMinutes": 120,
    "recoveryDays": []
}')
on conflict (key) do nothing;
