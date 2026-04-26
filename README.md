# Crisis Coach

Real-time embodied AI mental health first responder.

## Local development

### Install

```bash
npm ci
npm --prefix client ci
```

### Run backend

```bash
node server/index.js
```

### Run worker

```bash
node server/worker.js
```

### Run client

```bash
npm --prefix client run dev
```

## Supabase schema

```sql
create table sessions (
  id uuid primary key,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  summary_text text
);

create table affect_log (
  id bigserial primary key,
  session_id uuid not null,
  timestamp timestamptz not null,
  dominant_emotion text,
  scores jsonb
);

create table action_log (
  id bigserial primary key,
  session_id uuid not null,
  timestamp timestamptz not null,
  intent_type text not null,
  transcript text,
  outcome text,
  metadata jsonb
);

create table biometric_log (
  id bigserial primary key,
  session_id uuid not null,
  timestamp timestamptz not null,
  hr_bpm integer,
  spo2_pct numeric
);
```

Disable RLS for v1.
