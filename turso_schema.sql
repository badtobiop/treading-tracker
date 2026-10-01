-- ==============================================================================
-- TradeMatrix AI — Turso (libSQL / SQLite) Production Database Schema
-- Database: trad-badtobiop.aws-ap-south-1.turso.io
-- ==============================================================================

-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  capital REAL DEFAULT 10000,
  auth_provider TEXT DEFAULT 'email',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create TRADES Table (100% Isolated Per-User Trading Journal)
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  asset TEXT NOT NULL,
  type TEXT NOT NULL,
  entry_price REAL NOT NULL,
  exit_price REAL,
  stop_loss REAL,
  take_profit REAL,
  lot_size REAL DEFAULT 1.0,
  pnl REAL DEFAULT 0,
  risk_reward_ratio REAL,
  strategy TEXT,
  session TEXT,
  rules_followed INTEGER DEFAULT 1,
  notes TEXT,
  screenshot TEXT,
  emotion TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create USER_SETTINGS Table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  initial_capital REAL DEFAULT 10000,
  currency TEXT DEFAULT '₹',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Indexes for Ultra-Fast Lookups
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
