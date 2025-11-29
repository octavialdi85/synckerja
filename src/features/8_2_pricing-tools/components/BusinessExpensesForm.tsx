import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Plus, Trash2, DollarSign, Calendar, Download, Upload } from 'lucide-react';
import { Separator } from '@/features/ui/separator';
import { Badge } from '@/features/ui/badge';
import { BusinessExpenseItem, BusinessExpenseCategory, TimePeriod, CostAllocationMethod } from '../types/pricingTypes';
import { formatRupiah } from '../utils/pricingUtils';
import { useBusinessExpenses } from '../hooks/useBusinessExpenses';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface BusinessExpensesFormProps {
  onExpensesChange: (expenses: BusinessExpenseItem[], total: number) => void;
  timePeriod: TimePeriod;
  costAllocationMethod: CostAllocationMethod;
  initialExpenses?: BusinessExpenseItem[];
  key?: string;
}

// DEFAULT_CATEGORIES dan MONTHS akan dibuat di dalam component untuk menggunakan translation

const COLORS = [
  'text-blue-600',
  'text-green-600',
  'text-yellow-600',
  'text-purple-600',
  'text-red-600',
  'text-orange-600',
  'text-indigo-600',
  'text-pink-600',
];

export const BusinessExpensesForm = ({
  onExpensesChange,
  timePeriod,
  costAllocationMethod,
  initialExpenses,
  key
}: BusinessExpensesFormProps) => {
  const { t } = useAppTranslation();
  
  // Create categories and months with translation
  const DEFAULT_CATEGORIES: BusinessExpenseCategory[] = [
    { id: 'rent', name: t('pricingTools.businessExpenses.category.rent', 'Sewa/Tempat Usaha'), isCustom: false, color: 'text-blue-600' },
    { id: 'salary', name: t('pricingTools.businessExpenses.category.salary', 'Gaji Karyawan'), isCustom: false, color: 'text-green-600' },
    { id: 'utilities', name: t('pricingTools.businessExpenses.category.utilities', 'Listrik, Air, Internet'), isCustom: false, color: 'text-yellow-600' },
    { id: 'marketing', name: t('pricingTools.businessExpenses.category.marketing', 'Marketing & Advertising'), isCustom: false, color: 'text-purple-600' },
    { id: 'insurance', name: t('pricingTools.businessExpenses.category.insurance', 'Asuransi & Legal'), isCustom: false, color: 'text-red-600' },
    { id: 'maintenance', name: t('pricingTools.businessExpenses.category.maintenance', 'Maintenance & Repair'), isCustom: false, color: 'text-orange-600' },
    { id: 'depreciation', name: t('pricingTools.businessExpenses.category.depreciation', 'Depresiasi Aset'), isCustom: false, color: 'text-indigo-600' },
  ];

  const MONTHS = [
    { value: 0, label: t('pricingTools.businessExpenses.month.all', 'Semua Bulan') },
    { value: 1, label: t('pricingTools.businessExpenses.month.january', 'Januari') },
    { value: 2, label: t('pricingTools.businessExpenses.month.february', 'Februari') },
    { value: 3, label: t('pricingTools.businessExpenses.month.march', 'Maret') },
    { value: 4, label: t('pricingTools.businessExpenses.month.april', 'April') },
    { value: 5, label: t('pricingTools.businessExpenses.month.may', 'Mei') },
    { value: 6, label: t('pricingTools.businessExpenses.month.june', 'Juni') },
    { value: 7, label: t('pricingTools.businessExpenses.month.july', 'Juli') },
    { value: 8, label: t('pricingTools.businessExpenses.month.august', 'Agustus') },
    { value: 9, label: t('pricingTools.businessExpenses.month.september', 'September') },
    { value: 10, label: t('pricingTools.businessExpenses.month.october', 'Oktober') },
    { value: 11, label: t('pricingTools.businessExpenses.month.november', 'November') },
    { value: 12, label: t('pricingTools.businessExpenses.month.december', 'Desember') },
  ];
  
  const [expenses, setExpenses] = useState<BusinessExpenseItem[]>(() => {
    return initialExpenses || [];
  });
  const [categories, setCategories] = useState<BusinessExpenseCategory[]>(DEFAULT_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const { expenses: savedExpenses, isLoading: loadingExpenses, saveMultipleExpenses, isSavingMultiple } = useBusinessExpenses();

  // Load from initial expenses (template) OR from database (template takes priority)
  useEffect(() => {
    if (initialExpenses && initialExpenses.length > 0) {
      // Template data takes priority
      setExpenses(initialExpenses);
    } else if (savedExpenses && savedExpenses.length > 0) {
      // Fallback to database
      const filtered = savedExpenses.filter(
        exp => !exp.month || (timePeriod === 'monthly' ? true : exp.month === 0)
      );
      if (filtered.length > 0) {
        setExpenses(filtered);
      }
    }
  }, [initialExpenses, savedExpenses, timePeriod]);

  // Calculate total expenses
  const calculateTotalExpenses = (): number => {
    if (timePeriod === 'yearly') {
      // Jika yearly, hitung total semua expenses
      return expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    } else {
      // Jika monthly, hitung per bulan
      // Expenses dengan month = 0 atau null berarti berlaku untuk semua bulan
      // Expenses dengan month spesifik hanya untuk bulan tersebut
      const monthlyTotals: { [key: number]: number } = {};
      
      expenses.forEach(item => {
        const month = item.month ?? 0; // 0 = semua bulan
        if (month === 0) {
          // Distribusikan ke semua 12 bulan
          for (let i = 1; i <= 12; i++) {
            monthlyTotals[i] = (monthlyTotals[i] || 0) + (item.amount || 0);
          }
        } else {
          monthlyTotals[month] = (monthlyTotals[month] || 0) + (item.amount || 0);
        }
      });
      
      // Ambil bulan dengan expenses tertinggi
      const values = Object.values(monthlyTotals);
      return values.length > 0 ? Math.max(...values) : 0;
    }
  };

  const totalExpenses = calculateTotalExpenses();
  // Untuk per-unit method, cost per unit akan dihitung di pricingCalculationEngine
  // berdasarkan units required (bukan productionUnits)
  const costPerUnit = 0; // Tidak lagi dihitung di sini

  // Notify parent component when expenses change
  useEffect(() => {
    onExpensesChange(expenses, totalExpenses);
  }, [expenses, totalExpenses, onExpensesChange]);

  const addExpenseItem = () => {
    const newItem: BusinessExpenseItem = {
      id: `expense-${Date.now()}`,
      category: categories[0]?.id || 'rent',
      name: '',
      amount: 0,
      month: timePeriod === 'monthly' ? 0 : undefined, // Default semua bulan jika monthly
    };
    setExpenses([...expenses, newItem]);
  };

  const removeExpenseItem = (id: string) => {
    setExpenses(expenses.filter(item => item.id !== id));
  };

  const updateExpenseItem = (id: string, field: keyof BusinessExpenseItem, value: any) => {
    setExpenses(expenses.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addCustomCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    const newCategory: BusinessExpenseCategory = {
      id: `custom-${Date.now()}`,
      name: newCategoryName.trim(),
      isCustom: true,
      color: randomColor,
    };
    
    setCategories([...categories, newCategory]);
    setNewCategoryName('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-orange-600" />
            {t('pricingTools.businessExpenses.title', 'Business Expenses')}
          </CardTitle>
          <Badge variant={timePeriod === 'yearly' ? 'default' : 'secondary'}>
            {timePeriod === 'yearly' 
              ? t('pricingTools.businessExpenses.period.yearly', 'Tahunan')
              : t('pricingTools.businessExpenses.period.monthly', 'Bulanan')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Custom Category */}
        <div className="flex gap-2">
          <Input
            placeholder="Tambah kategori baru..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomCategory();
              }
            }}
            className="flex-1"
          />
          <Button onClick={addCustomCategory} size="sm" variant="outline" disabled={!newCategoryName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Kategori
          </Button>
        </div>

        {/* Expense Items */}
        <div className="space-y-3">
          {expenses.map((item) => {
            const category = categories.find(c => c.id === item.category);
            return (
              <div key={item.id} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      placeholder={t('pricingTools.businessExpenses.expenseName', 'Nama expense (e.g., Sewa Toko, Gaji Admin)')}
                      value={item.name}
                      onChange={(e) => updateExpenseItem(item.id, 'name', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExpenseItem(item.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={item.category}
                    onValueChange={(value) => updateExpenseItem(item.id, 'category', value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {timePeriod === 'monthly' && (
                    <Select
                      value={(item.month ?? 0).toString()}
                      onValueChange={(value) => updateExpenseItem(item.id, 'month', parseInt(value))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Jumlah"
                      value={item.amount || ''}
                      onChange={(e) => updateExpenseItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={addExpenseItem} variant="outline" className="flex-1" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('pricingTools.businessExpenses.addExpense', 'Tambah Expense')}
          </Button>
          <Button 
            onClick={async () => {
              if (expenses.length > 0) {
                try {
                  await saveMultipleExpenses(
                    expenses.map(exp => ({
                      ...exp,
                      time_period: timePeriod,
                      year: timePeriod === 'yearly' ? new Date().getFullYear() : undefined,
                    }))
                  );
                } catch (error) {
                  console.error('Error saving expenses:', error);
                }
              }
            }}
            variant="outline" 
            size="sm"
            disabled={expenses.length === 0 || isSavingMultiple}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isSavingMultiple ? t('pricingTools.businessExpenses.saving', 'Saving...') : t('pricingTools.businessExpenses.save', 'Save')}
          </Button>
        </div>

        <Separator />

        {/* Summary */}
        <div className="space-y-2">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-orange-700">
                {timePeriod === 'yearly' 
                  ? t('pricingTools.businessExpenses.total.yearly', 'Total Business Expenses (Tahunan)')
                  : t('pricingTools.businessExpenses.total.monthly', 'Total Business Expenses (Bulan Tertinggi)')}:
              </span>
              <span className="text-xl font-bold text-orange-800">
                {formatRupiah(totalExpenses)}
              </span>
            </div>
            
            {costAllocationMethod === 'per-unit' && (
              <div className="mt-2 pt-2 border-t border-orange-300">
                <p className="text-xs text-orange-600">
                  <strong>Catatan:</strong> Untuk metode "Per Unit", operational cost per unit akan dihitung berdasarkan unit yang diperlukan untuk mencapai target (break-even atau target profit).
                </p>
              </div>
            )}
            
            {timePeriod === 'monthly' && (
              <div className="mt-2 pt-2 border-t border-orange-300">
                <p className="text-xs text-orange-600">
                  {t('pricingTools.businessExpenses.total.note', '* Menampilkan bulan dengan expenses tertinggi untuk perhitungan target yang lebih konservatif')}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

