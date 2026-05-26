-- Full Supabase SQL migration
-- Run ALL of this in Supabase SQL Editor

-- 1. Create all tables

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  birthdate date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  summary text NOT NULL,
  tags text[] DEFAULT '{}' NOT NULL,
  day_number integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS entries_user_id_idx ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS entries_day_number_idx ON public.journal_entries(day_number);
CREATE INDEX IF NOT EXISTS entries_tags_idx ON public.journal_entries USING gin(tags);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  sequence integer NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(entry_id, sequence)
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  time time NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  last_sent timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, birthdate)
  VALUES (new.id, new.raw_user_meta_data->>'name', (new.raw_user_meta_data->>'birthdate')::date);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read own entries" ON public.journal_entries;
CREATE POLICY "Users can read own entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own entries" ON public.journal_entries;
CREATE POLICY "Users can insert own entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own entries" ON public.journal_entries;
CREATE POLICY "Users can update own entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON public.journal_entries;
CREATE POLICY "Users can delete own entries"
  ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read messages on own entries" ON public.ai_messages;
CREATE POLICY "Users can read messages on own entries"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE id = ai_messages.entry_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages on own entries" ON public.ai_messages;
CREATE POLICY "Users can insert messages on own entries"
  ON public.ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE id = ai_messages.entry_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own reminders" ON public.reminders;
CREATE POLICY "Users can manage own reminders"
  ON public.reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
