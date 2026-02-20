-- Migration: Add "Tools" category to password_categories table
-- Purpose: Add new "Tools" category for password manager
-- Date: 2025-02-02

-- Insert "Tools" category if it doesn't exist
INSERT INTO password_categories (name, icon, created_at, updated_at)
SELECT 'Tools', 'wrench', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM password_categories WHERE name = 'Tools'
);

