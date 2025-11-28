# PPh21 Calculator Module Structure

This directory contains all PPh21 (Indonesian Income Tax) calculator related components organized into a clean, modular structure.

## 📁 Directory Structure

```
8-4-pph-21/
├── pages/                    # PPh21 calculator page components
│   ├── PPh21Calculator.tsx   # Main PPh21 calculator page
│   └── index.ts
├── components/               # PPh21 calculator components
│   ├── PPh21Calculator.tsx   # Core PPh21 calculation component
│   └── index.ts
├── index.ts                  # Main module exports
└── README.md                 # This file
```

## 🎯 Component Categories

### Pages (`/pages`)
Main page component that represents the PPh21 calculator view:
- **PPh21Calculator**: Main PPh21 calculator page with StandardLayout integration

### Components (`/components`)
Core calculation component for PPh21 calculations:
- **PPh21Calculator**: Comprehensive PPh21 tax calculation component with Indonesian tax law compliance

## 🔗 Import Usage

### From Other Modules
```typescript
// Import main page
import { PPh21Calculator } from '@/features/8-4-pph-21/pages';

// Import components
import { PPh21Calculator } from '@/features/8-4-pph-21/components';

// Import everything
import * as PPh21CalculatorModule from '@/features/8-4-pph-21';
```

### Internal Cross-References
```typescript
// Within pages directory
import { PPh21Calculator as PPh21CalculatorComponent } from '../components/PPh21Calculator';

// Within components directory
// Self-contained component with no internal dependencies
```

## 🛣️ Route Configuration

The following route is configured in the application:

- `/tools/pph21-calculator` → PPh21Calculator

## 🔧 Integration Points

### Used By:
- **Main App Router**: Routes to PPh21 calculator page
- **StandardLayout**: Uses StandardLayout for consistent page structure

### Dependencies:
- **UI Components**: Uses shadcn/ui components (Card, Input, Button, RadioGroup, Checkbox, Separator, etc.)
- **Icons**: Uses Lucide React icons for UI elements
- **Toast System**: Uses Sonner toast for notifications
- **Layout**: Integrates with StandardLayout for consistent UI

## ✅ Migration Status

- ✅ All files organized into logical directories
- ✅ Import references updated throughout codebase
- ✅ Route configurations updated
- ✅ Index files created for clean exports
- ✅ Build verification successful
- ✅ No breaking changes to functionality

## 🚀 Benefits

1. **📁 Better Organization**: Components grouped by functionality
2. **🔗 Cleaner Imports**: Index files provide clean import paths
3. **🔧 Easier Maintenance**: Related files are co-located
4. **👨‍💻 Better Developer Experience**: Clear structure and documentation
5. **🔄 Modular Architecture**: Easy to extend with new PPh21 calculator features
6. **🇮🇩 Indonesian Tax Compliance**: Follows Indonesian tax law regulations

## 📝 Notes

- The PPh21 calculator is a specialized tool for Indonesian income tax calculations
- Implements Indonesian tax law with accurate PTKP (Non-Taxable Income) and tax bracket calculations
- Supports various marital statuses and dependent counts
- Features comprehensive tax calculation with detailed breakdown
- All components integrate with the main application layout system

## 🔄 Component Relationships

### Main Flow:
1. **PPh21Calculator** (Page) → **PPh21Calculator** (Core Component)
2. **PPh21Calculator** (Page) → **StandardLayout** (Layout Wrapper)

### Features:
- **Tax Calculation Engine**: Core Indonesian income tax calculation logic
- **PTKP Management**: Non-Taxable Income calculations based on marital status and dependents
- **Tax Bracket System**: Progressive tax rate calculations
- **Results Display**: Detailed tax calculation results and breakdown

## 🎨 UI Features

- **Interactive Calculator**: Real-time tax calculations as users input data
- **Marital Status Selection**: Radio button selection for different PTKP categories
- **Dependent Count Input**: Number input for dependent children
- **Income Input**: Primary income and additional income fields
- **Tax Deduction Options**: Checkbox options for various tax deductions
- **Results Visualization**: Clear display of tax calculations and breakdown
- **Export Functionality**: PDF and Excel export capabilities
- **Responsive Design**: Adapts to different screen sizes

## 🛠️ Calculation Features

### PTKP (Non-Taxable Income) Categories:
- **TK/0**: Single, no dependents - Rp 54,000,000
- **TK/1**: Single, 1 dependent - Rp 58,500,000
- **TK/2**: Single, 2 dependents - Rp 63,000,000
- **TK/3**: Single, 3+ dependents - Rp 67,500,000
- **K/0**: Married, no dependents - Rp 58,500,000
- **K/1**: Married, 1 dependent - Rp 63,000,000
- **K/2**: Married, 2 dependents - Rp 67,500,000
- **K/3**: Married, 3+ dependents - Rp 72,000,000

### Tax Brackets (Indonesian Tax Law):
- **0 - 60,000,000**: 5% tax rate
- **60,000,000 - 250,000,000**: 15% tax rate
- **250,000,000 - 500,000,000**: 25% tax rate
- **500,000,000+**: 30% tax rate

### Calculation Logic:
- **Gross Income**: Primary salary + additional income
- **Non-Taxable Income**: PTKP based on marital status and dependents
- **Taxable Income**: Gross income - Non-taxable income
- **Progressive Tax**: Applied based on tax brackets
- **Final Tax**: Total calculated tax amount

## 📊 Analysis Tools

### Tax Calculations:
- Monthly and annual tax calculations
- Progressive tax rate applications
- PTKP optimization recommendations
- Tax savings analysis
- Take-home pay calculations

### Reporting Features:
- Detailed tax breakdown
- Monthly vs annual comparisons
- Tax optimization suggestions
- Export capabilities (PDF, Excel)
- Historical calculation tracking

## 🎯 Use Cases

1. **HR Departments**: Calculate employee tax deductions for payroll processing
2. **Individual Employees**: Understand personal tax obligations and take-home pay
3. **Tax Consultants**: Provide accurate PPh21 calculations for clients
4. **Accounting Firms**: Generate precise tax calculations for Indonesian clients
5. **Small Businesses**: Calculate owner and employee tax obligations

## 🇮🇩 Indonesian Tax Law Compliance

### Legal Basis:
- **UU No. 36 Tahun 2008**: Indonesian Income Tax Law
- **PER-16/PJ/2016**: Director General of Tax Regulation
- **Current PTKP Rates**: 2024 tax year rates
- **Progressive Tax System**: Multi-tier tax brackets

### Compliance Features:
- **Accurate PTKP Calculations**: Based on current Indonesian tax law
- **Progressive Tax Application**: Correct tax bracket implementation
- **Marital Status Handling**: Proper PTKP category assignment
- **Dependent Calculations**: Accurate dependent count handling

## 📈 Calculation Examples

### Example 1: Single Employee (TK/0)
- **Gross Income**: Rp 10,000,000/month
- **Annual Income**: Rp 120,000,000
- **PTKP**: Rp 54,000,000
- **Taxable Income**: Rp 66,000,000
- **Tax Calculation**:
  - First 60,000,000 × 5% = Rp 3,000,000
  - Next 6,000,000 × 15% = Rp 900,000
  - **Total Annual Tax**: Rp 3,900,000
  - **Monthly Tax**: Rp 325,000

### Example 2: Married with 2 Children (K/2)
- **Gross Income**: Rp 15,000,000/month
- **Annual Income**: Rp 180,000,000
- **PTKP**: Rp 67,500,000
- **Taxable Income**: Rp 112,500,000
- **Tax Calculation**:
  - First 60,000,000 × 5% = Rp 3,000,000
  - Next 52,500,000 × 15% = Rp 7,875,000
  - **Total Annual Tax**: Rp 10,875,000
  - **Monthly Tax**: Rp 906,250

## 🔧 Technical Features

### Performance:
- Real-time calculations
- Optimized rendering
- Memory efficient
- Responsive design
- Fast computation

### Data Management:
- Input validation
- Error handling
- Auto-save functionality
- Export capabilities
- Calculation history

### Integration:
- StandardLayout integration
- Toast notifications
- Export functionality
- Print capabilities
- Mobile responsive

## 📱 Mobile Features

### Responsive Design:
- Mobile-optimized layout
- Touch-friendly inputs
- Responsive tables
- Mobile navigation
- Optimized calculations

### Mobile-Specific Features:
- Touch input optimization
- Mobile export options
- Responsive charts
- Mobile-friendly results display

## 🎓 Educational Features

### Tax Education:
- PTKP explanation
- Tax bracket visualization
- Calculation methodology
- Indonesian tax law references
- Best practices guidance

### Interactive Learning:
- Step-by-step calculations
- Visual tax bracket display
- PTKP category explanations
- Tax optimization tips
- FAQ and help system

## 📊 Export and Reporting

### Export Formats:
- **PDF Reports**: Professional tax calculation reports
- **Excel Files**: Spreadsheet format for further analysis
- **Print Format**: Printer-friendly layouts
- **Email Sharing**: Direct email functionality

### Report Contents:
- Tax calculation summary
- Detailed breakdown
- PTKP information
- Tax bracket analysis
- Optimization recommendations

## 🔒 Security and Privacy

### Data Protection:
- Client-side calculations
- No server-side data storage
- Local processing only
- Privacy-focused design
- Secure calculations

### Compliance:
- Indonesian data protection
- Tax calculation accuracy
- Legal compliance
- Audit trail capability
- Professional standards
