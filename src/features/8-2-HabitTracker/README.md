# Habit Tracker Feature

## 📁 File Organization

### Directory Structure
```
8-2-HabitTracker/
├── components/              # React components
│   ├── HabitList.tsx        # Main habit list component
│   ├── HabitStats.tsx       # Statistics overview cards
│   ├── HabitFilters.tsx     # Filter component
│   ├── HabitCalendar.tsx    # Calendar view component
│   ├── HabitFormModal.tsx   # Create/Edit habit modal
│   ├── HabitEntryModal.tsx  # Log entry modal
│   └── index.ts             # Centralized exports
├── context/                 # React context providers
│   └── HabitTrackerContext.tsx  # Main context provider
├── pages/                   # Page components
│   └── HabitTrackerPage.tsx # Main page component
├── types/                   # TypeScript type definitions
│   └── index.ts             # All type definitions
└── README.md                # Documentation
```

## 🎯 Features

- ✅ Create, edit, and delete habits
- ✅ Track habit entries with dates and counts
- ✅ View statistics (completion rate, streaks)
- ✅ Calendar view for visual tracking
- ✅ Filter habits by frequency and status
- ✅ Search functionality
- ✅ Color-coded habits
- ✅ Daily/Weekly/Monthly frequency support

## 📊 Components

### HabitList
Main component displaying all habits with their statistics and actions.

### HabitStats
Overview cards showing:
- Total Habits
- Active Habits
- Average Completion Rate
- Total Streak

### HabitFilters
Filter component with:
- Search input
- Frequency filter (Daily/Weekly/Monthly)
- Status filter (Active/Inactive)

### HabitCalendar
Calendar view showing:
- Monthly calendar grid
- Entry indicators per day
- Color-coded habit dots
- Navigation between months

### HabitFormModal
Modal for creating/editing habits with:
- Name and description
- Frequency selection
- Target count
- Color picker
- Active/Inactive toggle

### HabitEntryModal
Modal for logging habit entries with:
- Date picker
- Count input
- Notes field
- Target display

## 🔧 Context API

The `HabitTrackerContext` provides:
- `habits`: Array of all habits
- `entries`: Array of all habit entries
- `stats`: Calculated statistics for each habit
- `loading`: Loading state
- `filters`: Current filter state
- `updateFilter`: Update filter function
- `addHabit`: Create new habit
- `updateHabit`: Update existing habit
- `deleteHabit`: Delete habit
- `addEntry`: Log new entry
- `updateEntry`: Update entry
- `deleteEntry`: Delete entry
- `refreshData`: Refresh all data
- `filteredHabits`: Filtered habits based on current filters

## 📝 Types

### Habit
- `id`: string
- `name`: string
- `description?`: string
- `color?`: string
- `icon?`: string
- `frequency`: 'daily' | 'weekly' | 'monthly'
- `target_count`: number
- `created_at`: string
- `updated_at`: string
- `is_active`: boolean
- `organization_id`: string
- `created_by`: string

### HabitEntry
- `id`: string
- `habit_id`: string
- `entry_date`: string
- `count`: number
- `notes?`: string
- `created_at`: string
- `updated_at`: string
- `created_by`: string

### HabitStats
- `habit_id`: string
- `habit_name`: string
- `total_entries`: number
- `completion_rate`: number
- `current_streak`: number
- `longest_streak`: number
- `last_entry_date`: string | null

## 🎨 Styling

- Uses Tailwind CSS for styling
- Consistent with other features in the application
- Responsive design
- Uses shadcn/ui components

## 🔌 Integration

To use this feature:
1. Import `HabitTrackerProvider` and wrap your component
2. Use `useHabitTracker` hook to access context
3. Import components from `components/index.ts`

## 📋 Database Schema

### habits table
- id (uuid, primary key)
- name (text)
- description (text, nullable)
- color (text, nullable)
- icon (text, nullable)
- frequency (text: 'daily' | 'weekly' | 'monthly')
- target_count (integer)
- created_at (timestamp)
- updated_at (timestamp)
- is_active (boolean)
- organization_id (uuid, foreign key)
- created_by (uuid, foreign key)

### habit_entries table
- id (uuid, primary key)
- habit_id (uuid, foreign key)
- entry_date (date)
- count (integer)
- notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- organization_id (uuid, foreign key)
- created_by (uuid, foreign key)
