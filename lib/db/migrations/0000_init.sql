-- =============================================================================
-- 0000_init.sql — initial schema
-- =============================================================================
-- Manually authored to keep auth.users foreign keys + RLS policies in one place.
-- Drizzle-generated migrations will live alongside this file once the schema
-- evolves; for v1 the structure is small enough that a single hand-written
-- migration is the clearest source of truth.

-- enums --------------------------------------------------------------------

CREATE TYPE assessment_kind AS ENUM ('diagnostic', 'quiz', 'exercise');
CREATE TYPE tutor_role AS ENUM ('user', 'assistant', 'tool');
CREATE TYPE code_runtime AS ENUM ('pyodide', 'colab');

-- profiles -----------------------------------------------------------------

CREATE TABLE profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- onboarding ---------------------------------------------------------------

CREATE TABLE onboarding_responses (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goals             jsonb NOT NULL DEFAULT '[]'::jsonb,
  time_per_week_min integer,
  prior_knowledge   jsonb NOT NULL DEFAULT '{}'::jsonb,
  learning_style    text,
  pain_points       jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at      timestamptz
);

-- mastery ------------------------------------------------------------------

CREATE TABLE topic_mastery (
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id           text NOT NULL,
  score              integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  last_practiced_at  timestamptz,
  streak             integer NOT NULL DEFAULT 0,
  notes              text,
  PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX topic_mastery_user_idx ON topic_mastery(user_id);

-- assessments --------------------------------------------------------------

CREATE TABLE assessments (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id    text NOT NULL,
  kind        assessment_kind NOT NULL,
  prompt      jsonb NOT NULL,
  response    jsonb,
  score       integer,
  feedback    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assessments_user_topic_idx ON assessments(user_id, topic_id);

-- tutor sessions + messages -----------------------------------------------

CREATE TABLE tutor_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id   text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz
);

CREATE INDEX tutor_sessions_user_idx ON tutor_sessions(user_id);

CREATE TABLE tutor_messages (
  id         bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,
  role       tutor_role NOT NULL,
  ciphertext bytea NOT NULL,
  nonce      bytea NOT NULL,
  provider   text,
  model      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tutor_messages_session_idx ON tutor_messages(session_id);

-- code submissions --------------------------------------------------------

CREATE TABLE code_submissions (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id   text NOT NULL,
  source     text NOT NULL,
  runtime    code_runtime NOT NULL,
  result     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX code_submissions_user_idx ON code_submissions(user_id);

-- row-level security ------------------------------------------------------

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_mastery         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions      ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles self-select" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles self-modify" ON profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- onboarding_responses
CREATE POLICY "onboarding self-all" ON onboarding_responses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- topic_mastery
CREATE POLICY "mastery self-all" ON topic_mastery
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- assessments
CREATE POLICY "assessments self-all" ON assessments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tutor_sessions
CREATE POLICY "tutor_sessions self-all" ON tutor_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tutor_messages — joined through session ownership
CREATE POLICY "tutor_messages via session" ON tutor_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tutor_sessions s
      WHERE s.id = tutor_messages.session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tutor_sessions s
      WHERE s.id = tutor_messages.session_id AND s.user_id = auth.uid()
    )
  );

-- code_submissions
CREATE POLICY "code_submissions self-all" ON code_submissions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- profile auto-provisioning -----------------------------------------------
-- Create a profile row whenever a new Supabase auth user signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
