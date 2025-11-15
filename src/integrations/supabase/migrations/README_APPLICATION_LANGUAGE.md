# Application Language Table - Documentation

## 📋 Overview

Table `application_language` digunakan untuk menyimpan preferensi bahasa aplikasi (Indonesia/Inggris) per organization.

## 🗂️ Table Structure

### Table Name
`public.application_language`

### Columns

| Column Name | Type | Nullable | Default | Description |
|-------------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `organization_id` | UUID | NO | - | Foreign key ke `organizations(id)` - UNIQUE |
| `is_indonesian` | BOOLEAN | NO | `true` | `true` = Indonesia, `false` = Inggris |
| `created_by` | UUID | YES | - | Foreign key ke `auth.users(id)` - Optional |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Timestamp creation |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Timestamp update (auto-updated) |

## 🔒 Constraints

1. **Primary Key**: `id` (UUID)
2. **Unique Constraint**: `organization_id` - Satu language setting per organization
3. **Foreign Key**: 
   - `organization_id` → `organizations(id)` ON DELETE CASCADE
   - `created_by` → `auth.users(id)` ON DELETE SET NULL

## 📊 Indexes

1. `idx_application_language_organization_id` - Index pada `organization_id`
2. `idx_application_language_is_indonesian` - Index pada `is_indonesian`

## 🔐 Row Level Security (RLS)

RLS enabled dengan policies:
- **SELECT**: Users dapat melihat language settings untuk organization mereka
- **INSERT**: Users dapat insert language settings untuk organization mereka
- **UPDATE**: Users dapat update language settings untuk organization mereka

## 🔄 Triggers

- `trigger_update_application_language_updated_at` - Auto-update `updated_at` pada UPDATE

## 📝 Usage Examples

### Insert Language Setting
```sql
INSERT INTO public.application_language (organization_id, is_indonesian, created_by)
VALUES ('org-uuid-here', true, 'user-uuid-here');
```

### Update Language Setting
```sql
UPDATE public.application_language
SET is_indonesian = false, updated_at = NOW()
WHERE organization_id = 'org-uuid-here';
```

### Get Language Setting
```sql
SELECT is_indonesian
FROM public.application_language
WHERE organization_id = 'org-uuid-here';
```

### Upsert Language Setting (PostgreSQL 9.5+)
```sql
INSERT INTO public.application_language (organization_id, is_indonesian, created_by)
VALUES ('org-uuid-here', true, 'user-uuid-here')
ON CONFLICT (organization_id)
DO UPDATE SET 
  is_indonesian = EXCLUDED.is_indonesian,
  updated_at = NOW();
```

## 🎯 Business Logic

### Language Values
- `is_indonesian = true` → Bahasa Indonesia
- `is_indonesian = false` → English

### Default Value
- Default: `true` (Bahasa Indonesia)

### One Setting Per Organization
- Setiap organization hanya bisa memiliki satu language setting
- Unique constraint pada `organization_id` memastikan hal ini

## ✅ Migration Applied

**Migration Name**: `create_application_language_table`
**Status**: ✅ Applied Successfully
**Date**: Applied via MCP tools


