create table songs (
  id uuid default gen_random_uuid() primary key,
  task_id text not null unique,
  prompt text not null,
  style text not null,
  title text not null,
  status text not null,
  audio_url text,
  stream_audio_url text,
  image_url text,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

-- Enable realtime
alter table songs replica identity full; 