# KOL Management Dashboard

This module contains all components, hooks, and utilities for the KOL (Key Opinion Leader) Management Dashboard functionality.

## Directory Structure

```
6_4_1_dashboard/
├── components/           # All React components
│   ├── EnhancedKOLDashboard.tsx
│   ├── EnhancedKOLManagementContent.tsx
│   ├── EnhancedKOLCampaignsTab.tsx
│   ├── EnhancedKOLContentPostTab.tsx
│   ├── KOLPaymentTermsTab.tsx
│   ├── EnhancedKOLAnalyticsTab.tsx
│   ├── KOLCampaignsPageContent.tsx
│   ├── KOLContentPostPageContent.tsx
│   ├── KOLManagementPageContent.tsx
│   ├── KOLCampaignsFilters.tsx
│   ├── KOLCampaignsMetricsCards.tsx
│   ├── KOLCampaignsTable.tsx
│   ├── KOLCampaignsOverview.tsx
│   ├── KOLContentPostFilters.tsx
│   ├── KOLContentPostMetricsCards.tsx
│   ├── KOLContentPostTable.tsx
│   ├── KOLContentPostOverview.tsx
│   ├── KOLManagementFilters.tsx
│   ├── KOLManagementMetricsCards.tsx
│   ├── KOLManagementTable.tsx
│   ├── KOLManagementOverview.tsx
│   └── index.ts
├── hooks/               # Custom React hooks
│   ├── useKOLAnalytics.ts
│   ├── useKOLProfiles.ts
│   ├── useKOLCampaigns.ts
│   ├── useOptimizedKOLPerformance.ts
│   ├── useEnhancedKOLContentPosts.ts
│   ├── useKOLManagementData.ts
│   └── index.ts
├── pages/               # Page components
│   ├── KOLDashboardPage.tsx
│   └── index.ts
├── types/               # TypeScript type definitions
├── modals/              # Modal components
├── utils/               # Utility functions
├── index.ts             # Main export file
└── README.md            # This file
```

## Features

### Dashboard Tab
- Overview metrics and analytics
- Performance charts and graphs
- Key statistics display

### KOL Management Tab
- KOL profile management
- Performance tracking
- Filtering and search functionality

### Campaigns Tab
- Campaign creation and management
- Campaign performance tracking
- Budget allocation and tracking

### Content Post Tab
- Content post management
- Performance metrics
- Content scheduling

### Payment Terms Tab
- Payment terms management
- Payment tracking
- Financial reporting

### Analytics Tab
- Advanced analytics and reporting
- Performance insights
- Data visualization

## Routing

The module supports both short and full path routing:

- `/kol-management` → Redirects to `/kol-management/dashboard`
- `/kol-management/dashboard`
- `/kol-management/kol-management`
- `/kol-management/content-post`
- `/kol-management/campaigns`
- `/kol-management/payment-terms`
- `/kol-management/analytics`

- `/digital-marketing/kol-management` → Redirects to `/digital-marketing/kol-management/dashboard`
- `/digital-marketing/kol-management/dashboard`
- `/digital-marketing/kol-management/kol-management`
- `/digital-marketing/kol-management/content-post`
- `/digital-marketing/kol-management/campaigns`
- `/digital-marketing/kol-management/payment-terms`
- `/digital-marketing/kol-management/analytics`

## Usage

```typescript
import { KOLDashboardPage } from '@/components/1_halaman/6_4_1_dashboard';

// Use in routing
<Route path="/kol-management" element={<KOLDashboardPage />} />
```

## Components

### Main Components
- `EnhancedKOLDashboard` - Main dashboard component with metrics and charts
- `EnhancedKOLManagementContent` - KOL management interface
- `EnhancedKOLCampaignsTab` - Campaigns management
- `EnhancedKOLContentPostTab` - Content post management
- `KOLPaymentTermsTab` - Payment terms management
- `EnhancedKOLAnalyticsTab` - Analytics and reporting

### Supporting Components
- Various filters, tables, overviews, and metrics cards
- All components are properly organized and exported

## Hooks

- `useKOLAnalytics` - Analytics data management
- `useKOLProfiles` - KOL profile data
- `useKOLCampaigns` - Campaign data management
- `useOptimizedKOLPerformance` - Performance data optimization
- `useEnhancedKOLContentPosts` - Content post data management
- `useKOLManagementData` - General KOL management data

## Styling

- Uses Tailwind CSS for styling
- Responsive design with mobile support
- Consistent with the application's design system
- Includes seamless scrolling for better UX

## Performance

- Lazy loading for better performance
- Optimized data fetching
- Efficient re-rendering with proper state management
- Code splitting for reduced bundle size
