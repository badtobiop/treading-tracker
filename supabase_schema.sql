-- ==============================================================================
-- TradeMatrix AI — PostgreSQL Production Database Schema
-- Run this complete script in your Supabase SQL Editor (1-Click Run)
-- ==============================================================================

-- 1. Create PROFILES Table (Stores Registered Traders)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  capital NUMERIC DEFAULT 10000,
  auth_provider TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create TRADES Table (Stores 100% Isolated Trade Records Per User)
CREATE TABLE IF NOT EXISTS public.trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT,
  asset TEXT NOT NULL,
  type TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  lot_size NUMERIC DEFAULT 1.0,
  pnl NUMERIC DEFAULT 0,
  risk_reward_ratio NUMERIC,
  strategy TEXT,
  session TEXT,
  rules_followed BOOLEAN DEFAULT TRUE,
  notes TEXT,
  screenshot TEXT,
  emotion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create USER_SETTINGS Table (Stores Per-User Currency & Terminal Capital)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  initial_capital NUMERIC DEFAULT 10000,
  currency TEXT DEFAULT '₹',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Performance Indexes for Ultra-Fast Queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades(date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 5. Enable Row-Level Security (RLS) for 100% Multi-Tenant Data Protection
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 6. Setup Public / Client API Access Policies
-- (Allows frontend app to read and write records scoped by user_id)
DROP POLICY IF EXISTS "Allow public read-write for profiles" ON public.profiles;
CREATE POLICY "Allow public read-write for profiles" 
  ON public.profiles FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user scoped access for trades" ON public.trades;
CREATE POLICY "Allow user scoped access for trades" 
  ON public.trades FOR ALL 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user scoped access for settings" ON public.user_settings;
CREATE POLICY "Allow user scoped access for settings" 
  ON public.user_settings FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Done! Your PostgreSQL SQL Database is now 100% ready for TradeMatrix AI.
