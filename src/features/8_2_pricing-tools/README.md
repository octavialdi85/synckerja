# Pricing Tools Module Structure

This directory contains all pricing tools related components organized into a clean, modular structure.

## 📁 Directory Structure

```
8_2_pricing-tools/
├── pages/                    # Pricing tools page components
│   ├── PricingTools.tsx      # Main pricing tools page
│   └── index.ts
├── components/               # Pricing tools components
│   ├── PricingToolsLayout.tsx
│   ├── PriceCalculator.tsx
│   ├── PriceCalculatorTutorial.tsx
│   ├── PricingDashboard.tsx
│   ├── ProductCreateDialog.tsx
│   ├── ProductManager.tsx
│   ├── ProductManagerFilters.tsx
│   ├── ProductManagerMetricsCards.tsx
│   ├── ProductManagerOverview.tsx
│   ├── ProductManagerPage.tsx
│   ├── ProductManagerTable.tsx
│   ├── PromoSimulation.tsx
│   ├── PromoSimulationWithTutorial.tsx
│   ├── DynamicCostBreakdown.tsx
│   └── index.ts
├── index.ts                  # Main module exports
└── README.md                 # This file
```

## 🎯 Component Categories

### Pages (`/pages`)
Main page component that represents the pricing tools view:
- **PricingTools**: Main pricing tools page with StandardLayout integration

### Components (`/components`)
Reusable components used in the pricing tools page:
- **PricingToolsLayout**: Main layout component with navigation tabs
- **PriceCalculator**: Price calculation component with tutorial integration
- **PriceCalculatorTutorial**: Tutorial component for price calculator
- **PricingDashboard**: Dashboard component showing pricing metrics
- **ProductCreateDialog**: Dialog for creating new products
- **ProductManager**: Product management component
- **ProductManagerFilters**: Filter component for product management
- **ProductManagerMetricsCards**: Metrics cards for product management
- **ProductManagerOverview**: Overview component for product management
- **ProductManagerPage**: Complete product management page
- **ProductManagerTable**: Table component for product management
- **PromoSimulation**: Promo simulation component
- **PromoSimulationWithTutorial**: Promo simulation with tutorial integration
- **DynamicCostBreakdown**: Dynamic cost breakdown component

## 🔗 Import Usage

### From Other Modules
```typescript
// Import main page
import { PricingTools } from '@/features/8_2_pricing-tools/pages';

// Import components
import { PricingToolsLayout, PriceCalculator, ProductManager } from '@/features/8_2_pricing-tools/components';

// Import everything
import * as PricingToolsModule from '@/features/8_2_pricing-tools';
```

### Internal Cross-References
```typescript
// Within pages directory
import { PricingToolsLayout } from '../components/PricingToolsLayout';

// Within components directory
import { PriceCalculator } from './PriceCalculator';
import { ProductManager } from './ProductManager';
```

## 🛣️ Route Configuration

The following routes are configured in the application:

- `/tools/pricing-tools` → PricingTools page
- `/tools/promo-simulation` → PromoSimulationWithTutorial component (via PricingToolsLayout)

## 🔧 Integration Points

### Used By:
- **Main App Router**: Routes to pricing tools page
- **Lazy Routes**: Lazy loading configuration for pricing tools page
- **PromoSimulationPage**: Uses pricing tools components
- **ProductManagerPage**: Uses pricing tools components

### Dependencies:
- **UI Components**: Uses shadcn/ui components (Card, Dialog, Table, etc.)
- **React Router**: Navigation between pricing tools sections
- **Supabase**: Database integration for product data

## ✅ Migration Status

- ✅ All files organized into logical directories
- ✅ Import references updated throughout codebase
- ✅ Route configurations updated
- ✅ Lazy loading configurations updated
- ✅ Index files created for clean exports
- ✅ Build verification successful
- ✅ No breaking changes to functionality

## 🚀 Benefits

1. **Better Organization**: Components grouped by functionality
2. **Cleaner Imports**: Index files provide clean import paths
3. **Easier Maintenance**: Related files are co-located
4. **Better Developer Experience**: Clear structure and documentation
5. **Modular Architecture**: Easy to extend with new pricing features

## 📝 Notes

- The pricing tools page uses a tabbed navigation layout
- Components are organized by functionality (calculator, dashboard, product management)
- The layout supports multiple pricing tool sections
- All components integrate with the main application sidebar and header

## 🔄 Component Relationships

### Main Layout Flow:
1. **PricingTools** (Page) → **PricingToolsLayout** (Layout)
2. **PricingToolsLayout** → **PriceCalculator** or **PromoSimulationWithTutorial** (Content)
3. **PriceCalculator** → **PriceCalculatorTutorial** + **DynamicCostBreakdown** (Sub-components)

### Product Management Flow:
1. **ProductManager** → **ProductManagerFilters** + **ProductManagerMetricsCards** + **ProductManagerTable** + **ProductManagerOverview**
2. **ProductManagerFilters** → **ProductCreateDialog** (Action)
3. **ProductManagerTable** → **ActionsDropdown** (External component)

## 🎨 UI Features

- **Tabbed Navigation**: Switch between pricing tools and promo simulation
- **Responsive Layout**: Adapts to different screen sizes
- **Interactive Components**: Calculators, simulators, and management tools
- **Modal Dialogs**: User-friendly interfaces for CRUD operations
- **Data Tables**: Comprehensive product management with filtering
- **Tutorial Integration**: Built-in tutorials for complex features

## 🛠️ Tools Included

### Pricing Calculator:
- Dynamic cost breakdown
- Interactive pricing calculations
- Tutorial integration

### Promo Simulation:
- Promotional pricing simulation
- Tutorial-guided experience
- Comprehensive analysis tools

### Product Management:
- Product CRUD operations
- Metrics and analytics
- Filtering and search capabilities
- Overview dashboard
