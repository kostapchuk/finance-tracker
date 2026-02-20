-- Supabase Database Schema for Finance Tracker
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance DECIMAL(18,6) NOT NULL DEFAULT 0,
  color TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER,
  hidden_from_dashboard BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income Sources table
CREATE TABLE IF NOT EXISTS income_sources (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER,
  hidden_from_dashboard BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  category_type TEXT DEFAULT 'expense',
  budget DECIMAL(18,6),
  budget_period TEXT,
  sort_order INTEGER,
  hidden_from_dashboard BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  currency TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  comment TEXT,
  income_source_id BIGINT,
  category_id BIGINT,
  account_id BIGINT,
  to_account_id BIGINT,
  to_amount DECIMAL(18,6),
  loan_id BIGINT,
  main_currency_amount DECIMAL(18,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  person_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(18,6) NOT NULL,
  currency TEXT NOT NULL,
  paid_amount DECIMAL(18,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  account_id BIGINT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  blur_financial_figures BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom Currencies table
CREATE TABLE IF NOT EXISTS custom_currencies (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_accounts_user_updated ON accounts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_income_sources_user_updated ON income_sources(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_user_updated ON categories(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account ON transactions(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_loan ON transactions(user_id, loan_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_user_updated ON loans(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_currencies_user ON custom_currencies(user_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_currencies ENABLE ROW LEVEL SECURITY;

-- For Phase 1 (no auth), allow all operations based on user_id matching
-- These policies allow anonymous access but filter by user_id

CREATE POLICY "users_can_read_own_accounts" ON accounts
  FOR SELECT USING (true);

CREATE POLICY "users_can_insert_own_accounts" ON accounts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_update_own_accounts" ON accounts
  FOR UPDATE USING (true);

CREATE POLICY "users_can_delete_own_accounts" ON accounts
  FOR DELETE USING (true);

CREATE POLICY "users_can_read_own_income_sources" ON income_sources
  FOR SELECT USING (true);

CREATE POLICY "users_can_insert_own_income_sources" ON income_sources
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_update_own_income_sources" ON income_sources
  FOR UPDATE USING (true);

CREATE POLICY "users_can_delete_own_income_sources" ON income_sources
  FOR DELETE USING (true);

CREATE POLICY "users_can_read_own_categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "users_can_insert_own_categories" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_update_own_categories" ON categories
  FOR UPDATE USING (true);

CREATE POLICY "users_can_delete_own_categories" ON categories
  FOR DELETE USING (true);

CREATE POLICY "users_can_read_own_transactions" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "users_can_insert_own_transactions" ON transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_update_own_transactions" ON transactions
  FOR UPDATE USING (true);

CREATE POLICY "users_can_delete_own_transactions" ON transactions
  FOR DELETE USING (true);

CREATE POLICY "users_can_read_own_loans" ON loans
  FOR SELECT USING (true);

CREATE POLICY "users_can_insert_own_loans" ON loans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_update_own_loans" ON loans
  FOR UPDATE USING (true);

CREATE POLICY "users_can_delete_own_loans" ON loans
  FOR DELETE USING (true);

CREATE POLICY "users_can_read_own_settings" ON settings
  FOR SELECT USING (true);

CREATE POLICY "users_can_insert_own_settings" ON settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_update_own_settings" ON settings
  FOR UPDATE USING (true);

CREATE POLICY "users_can_read_own_custom_currencies" ON custom_currencies
  FOR SELECT USING (true);

CREATE POLICY "users_can_insert_own_custom_currencies" ON custom_currencies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "users_can_update_own_custom_currencies" ON custom_currencies
  FOR UPDATE USING (true);

CREATE POLICY "users_can_delete_own_custom_currencies" ON custom_currencies
  FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_income_sources_updated_at
  BEFORE UPDATE ON income_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_currencies_updated_at
  BEFORE UPDATE ON custom_currencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
