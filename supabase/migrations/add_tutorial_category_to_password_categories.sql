-- Migration: Add "Tutorial" category to password_categories table
-- Purpose: Add new "Tutorial" category for password manager
-- Date: 2026-01-05

-- Insert "Tutorial" category if it doesn't exist
INSERT INTO password_categories (name, icon, created_at, updated_at)
SELECT 'Tutorial', 'book-open', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM password_categories WHERE name = 'Tutorial'
);

