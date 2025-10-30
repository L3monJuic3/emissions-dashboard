-- Cloudflare D1 Database Schema for Emissions Dashboard
-- Run with: wrangler d1 execute emissions-db --file=schema.sql

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sector TEXT NOT NULL,
  region TEXT NOT NULL,
  ownership TEXT NOT NULL,
  baseline_year INTEGER NOT NULL,
  net_zero_year INTEGER NOT NULL,
  interim_target_year INTEGER,
  interim_reduction_percent INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Emissions Table
CREATE TABLE IF NOT EXISTS emissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  scope_1 REAL NOT NULL,
  scope_2 REAL,
  scope_3 REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, year)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_company_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_company_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_company_region ON companies(region);
CREATE INDEX IF NOT EXISTS idx_company_ownership ON companies(ownership);
CREATE INDEX IF NOT EXISTS idx_emissions_company ON emissions(company_id);
CREATE INDEX IF NOT EXISTS idx_emissions_year ON emissions(year);
CREATE INDEX IF NOT EXISTS idx_emissions_company_year ON emissions(company_id, year);

-- Verify tables created
SELECT name FROM sqlite_master WHERE type='table';