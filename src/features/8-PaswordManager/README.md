# Password Manager

Password Manager yang terintegrasi dengan Supabase untuk menyimpan dan mengelola password dengan aman.

## Struktur Database

### Tabel: `passwords`
Menyimpan semua password yang disimpan user.

**Kolom:**
- `id` (uuid) - Primary key
- `user_id` (uuid) - Foreign key ke auth.users
- `title` (varchar) - Judul/nama password
- `username` (varchar) - Username/email untuk login
- `password` (text) - Password (encrypted)
- `url` (text, nullable) - URL website
- `category_id` (uuid, nullable) - Foreign key ke password_categories
- `notes` (text, nullable) - Catatan tambahan
- `is_favorite` (boolean) - Status favorit
- `created_at` (timestamptz) - Waktu dibuat
- `updated_at` (timestamptz) - Waktu terakhir diupdate

### Tabel: `password_categories`
Menyimpan kategori password.

**Kolom:**
- `id` (uuid) - Primary key
- `name` (varchar) - Nama kategori
- `icon` (varchar) - Nama icon
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Kategori Default:**
1. **general** - Lock icon (Umum)
2. **email** - Mail icon (Email)
3. **social** - Globe icon (Social Media)
4. **finance** - Credit Card icon (Keuangan)
5. **work** - Briefcase icon (Pekerjaan)

## Fitur

1. ✅ **CRUD Operations**
   - Create: Tambah password baru
   - Read: Lihat daftar password
   - Update: Edit password yang ada
   - Delete: Hapus password

2. ✅ **Filtering & Search**
   - Filter berdasarkan kategori
   - Search by title, username, atau URL
   - Filter password favorit

3. ✅ **Password Management**
   - Toggle favorite
   - Password strength meter
   - Password generator
   - Copy to clipboard

4. ✅ **Statistics**
   - Total passwords
   - Strong passwords count
   - Weak passwords count
   - Favorites count

## File Structure

```
8-PaswordManager/
├── PasswordManagerPage.tsx       # Main component
├── types.ts                      # TypeScript interfaces
├── README.md                     # Documentation (this file)
├── hooks/
│   ├── index.ts                  # Export hook
│   └── usePasswords.ts           # Custom hook for Supabase
└── section/
    ├── index.ts                  # Export all components
    ├── HeaderAndTab.tsx          # Header with tabs
    ├── PasswordStats.tsx         # Statistics cards
    ├── SearchAndFilter.tsx       # Search dan filter
    ├── CategoryFilter.tsx        # Sidebar kategori
    ├── PasswordList.tsx          # List password
    ├── PasswordCard.tsx          # Card untuk setiap password
    ├── AddPasswordDialog.tsx     # Dialog add/edit
    ├── PasswordGenerator.tsx     # Password generator
    ├── PasswordStrengthMeter.tsx # Strength indicator
    ├── PasswordSidebarFooter.tsx # Footer sidebar
    └── PasswordListFooter.tsx    # Footer list
```

## Hook: usePasswords

Custom hook untuk mengakses dan memanipulasi data password dari Supabase.

### Import
```typescript
import { usePasswords } from './hooks/usePasswords';
// atau
import { usePasswords } from '@/components/8-PaswordManager/hooks';
```

### Usage
```typescript
const {
  passwords,        // Array of passwords
  categories,       // Array of categories
  loading,          // Loading state
  addPassword,      // Function to add password
  updatePassword,   // Function to update password
  deletePassword,   // Function to delete password
  toggleFavorite,   // Function to toggle favorite
  refetch,          // Function to refetch data
} = usePasswords();
```

### Methods

#### addPassword
```typescript
await addPassword({
  title: 'Gmail',
  username: 'user@example.com',
  password: 'MyPassword123!',
  url: 'https://gmail.com',
  category: 'email',
  notes: 'Personal email',
  isFavorite: false
});
```

#### updatePassword
```typescript
await updatePassword(passwordId, {
  title: 'Gmail Updated',
  username: 'user@example.com',
  password: 'NewPassword123!',
  url: 'https://gmail.com',
  category: 'email',
  notes: 'Updated notes',
  isFavorite: true
});
```

#### deletePassword
```typescript
await deletePassword(passwordId);
```

#### toggleFavorite
```typescript
await toggleFavorite(passwordId);
```

## Security Notes

⚠️ **PENTING:** 
- Password disimpan dalam bentuk text di database
- Untuk production, disarankan menggunakan encryption
- Implementasikan row-level security (RLS) di Supabase
- Pastikan hanya user yang bersangkutan yang bisa akses password mereka

## RLS Policies

Pastikan RLS diaktifkan untuk tabel `passwords`:

```sql
-- Enable RLS
ALTER TABLE passwords ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own passwords
CREATE POLICY "Users can view own passwords"
  ON passwords
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own passwords
CREATE POLICY "Users can insert own passwords"
  ON passwords
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own passwords
CREATE POLICY "Users can update own passwords"
  ON passwords
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own passwords
CREATE POLICY "Users can delete own passwords"
  ON passwords
  FOR DELETE
  USING (auth.uid() = user_id);
```

## Route

Path: `/tools/password-manager`

Guard: `UnifiedAuthGuard` dengan requirements:
- allowedStates: `['authenticated', 'verified', 'hasOrganization']`
- requiresActiveSubscription: `true`

## Migration Status

✅ **Status: Connected to Supabase**
- Tabel sudah dibuat
- Kategori default sudah ada
- Hook sudah dibuat
- Component sudah diupdate
- Mock data sudah dihapus

