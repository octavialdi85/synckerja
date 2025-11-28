# Promo Simulation Module Structure

This directory contains all promo simulation related components organized into a clean, modular structure.

## 📁 Directory Structure

```
8_2_2_promo-simulation/
├── pages/                    # Promo simulation page components
│   ├── PromoSimulationPage.tsx # Main promo simulation page
│   └── index.ts
├── components/               # Promo simulation components
│   ├── PromoSimulation.tsx
│   ├── PromoSimulationWithTutorial.tsx
│   └── index.ts
├── index.ts                  # Main module exports
└── README.md                 # This file
```

## 🎯 Component Categories

### Pages (`/pages`)
Main page component that represents the promo simulation view:
- **PromoSimulationPage**: Main promo simulation page with complete layout including sidebar and header integration

### Components (`/components`)
Reusable components used in the promo simulation page:
- **PromoSimulation**: Basic promo simulation component with pricing calculations
- **PromoSimulationWithTutorial**: Enhanced promo simulation component with integrated tutorial system

## 🔗 Import Usage

### From Other Modules
```typescript
// Import main page
import { PromoSimulationPage } from '@/components/1_halaman/8_2_2_promo-simulation/pages';

// Import components
import { PromoSimulation, PromoSimulationWithTutorial } from '@/components/1_halaman/8_2_2_promo-simulation/components';

// Import everything
import * from '@/components/1_halaman/8_2_2_promo-simulation';
```

### Internal Cross-References
```typescript
// Within pages directory
import { PromoSimulationWithTutorial } from '../components/PromoSimulationWithTutorial';

// Within components directory
import { PromoSimulation } from './PromoSimulation';
```

## 🛣️ Route Configuration

The following route is configured in the application:

- `/tools/promo-simulation` → PromoSimulationPage

## 🔧 Integration Points

### Used By:
- **Main App Router**: Routes to promo simulation page
- **Lazy Routes**: Lazy loading configuration for promo simulation page
- **PricingToolsLayout**: Uses PromoSimulationWithTutorial component for tab navigation

### Dependencies:
- **UI Components**: Uses shadcn/ui components (Card, Input, Button, Select, Badge, Tabs, etc.)
- **React Router**: Navigation integration
- **Icons**: Uses Lucide React icons for UI elements

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
5. **Modular Architecture**: Easy to extend with new promo simulation features

## 📝 Notes

- The promo simulation page is a standalone tool focused on promotional pricing analysis
- The page uses PromoSimulationWithTutorial component which includes comprehensive tutorial system
- All components integrate with the main application sidebar and header
- The simulation includes mock data for demonstration purposes

## 🔄 Component Relationships

### Main Flow:
1. **PromoSimulationPage** (Page) → **PromoSimulationWithTutorial** (Main Component)
2. **PromoSimulationWithTutorial** → **PromoSimulation** (Core Logic) + Tutorial System

### Features:
- **PromoSimulation**: Core simulation logic with pricing calculations
- **PromoSimulationWithTutorial**: Enhanced version with step-by-step guidance
- **Tutorial System**: Integrated help system with multiple tutorial tabs

## 🎨 UI Features

- **Interactive Simulation**: Real-time promotional pricing calculations
- **Tutorial Integration**: Step-by-step guidance system
- **Multiple Tutorial Tabs**: Different learning paths for users
- **Results Visualization**: Clear display of simulation outcomes
- **Input Validation**: Form validation for simulation parameters
- **Responsive Design**: Adapts to different screen sizes

## 🛠️ Simulation Features

### Pricing Analysis:
- Original price vs discounted price comparison
- Profit margin calculations
- Revenue impact analysis
- Break-even point analysis

### Tutorial System:
- **Getting Started**: Basic introduction to promo simulation
- **Pricing Strategy**: Understanding pricing principles
- **Market Analysis**: Market research and competitor analysis
- **Implementation**: How to implement promotional strategies

### Input Parameters:
- Original product price
- Discount percentage
- Cost of goods sold
- Marketing spend
- Expected volume increase

### Output Metrics:
- Discounted selling price
- Profit per unit
- Total profit impact
- Revenue change
- ROI calculations

## 📊 Analysis Tools

### Financial Metrics:
- Profit margin analysis
- Revenue impact assessment
- Cost-benefit analysis
- Break-even calculations

### Market Insights:
- Competitor pricing analysis
- Market positioning
- Customer behavior insights
- Promotion effectiveness metrics

## 🎯 Use Cases

1. **Marketing Teams**: Plan promotional campaigns with financial impact analysis
2. **Sales Teams**: Understand pricing strategies and their effects
3. **Management**: Make data-driven decisions about promotional activities
4. **Product Teams**: Analyze pricing strategies for new products
