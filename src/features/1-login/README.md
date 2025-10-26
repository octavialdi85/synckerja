# Login Feature Module

This module contains all the components and functionality needed for the login system in ProfitLoop.

## Directory Structure

```
src/features/1-login/
├── pages/
│   ├── Login.tsx                 # Main login page component
│   ├── Register.tsx             # Registration page
│   ├── CreateOrganization.tsx   # Organization creation page
│   └── ...                      # Other auth pages
├── hooks/
│   ├── use-mobile.tsx          # Mobile detection hook
│   └── use-toast.ts            # Toast notification hook
├── types/
│   └── index.ts                # TypeScript type definitions
├── AuthTestimonialsPanel.tsx   # Testimonials panel component
├── client.ts                   # Supabase client configuration
├── use-toast.ts                # Toast hook (root level)
└── index.ts                    # Main exports
```

## Main Components

### Login Page
- **File**: `pages/Login.tsx`
- **Purpose**: Main login form with email/password authentication
- **Features**:
  - Email and password validation
  - Password visibility toggle
  - Supabase authentication
  - Error handling and user feedback
  - Responsive design with testimonials panel

### AuthTestimonialsPanel
- **File**: `AuthTestimonialsPanel.tsx`
- **Purpose**: Left panel showing testimonials and badges
- **Features**:
  - Performance badges (Best Support, Leader, Easiest To Use)
  - Customer testimonials
  - Responsive design (hidden on mobile)

## Hooks

### useIsMobile
- **File**: `hooks/use-mobile.tsx`
- **Purpose**: Detect if the current viewport is mobile
- **Usage**: `const isMobile = useIsMobile();`

### useToast
- **File**: `use-toast.ts`
- **Purpose**: Toast notification system
- **Usage**: `const { toast } = useToast();`

## Configuration

### Supabase Client
- **File**: `client.ts`
- **Purpose**: Configured Supabase client with authentication settings
- **Features**:
  - Local storage persistence
  - Auto token refresh
  - TypeScript support with Database types

## Usage

```tsx
import { Login } from '@/features/1-login';

// Use in your routing
<Route path="/login" element={<Login />} />
```

## Dependencies

- `@supabase/supabase-js` - Supabase client
- `react-router-dom` - Routing
- `lucide-react` - Icons
- `@features/ui/*` - UI components (Card, Input, Button, Label)

## Features

- ✅ Email/password authentication
- ✅ Password visibility toggle
- ✅ Form validation
- ✅ Error handling
- ✅ Toast notifications
- ✅ Responsive design
- ✅ Supabase integration
- ✅ TypeScript support
