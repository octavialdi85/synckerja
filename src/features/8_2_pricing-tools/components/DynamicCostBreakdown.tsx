
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { Separator } from '@/features/ui/separator';

interface CostItem {
  id: string;
  name: string;
  amount: number;
  // Labor-specific fields
  timePeriod?: 'hourly' | 'daily' | 'monthly';
  quantity?: number;
}

interface CostCategory {
  id: string;
  title: string;
  items: CostItem[];
  color: string;
  isLaborCategory?: boolean;
}

export const DynamicCostBreakdown = () => {
  const [costCategories, setCostCategories] = useState<CostCategory[]>([
    {
      id: 'raw-materials',
      title: 'Raw Materials',
      items: [],
      color: 'text-blue-600'
    },
    {
      id: 'labor-cost',
      title: 'Labor Cost',
      items: [],
      color: 'text-green-600',
      isLaborCategory: true
    },
    {
      id: 'overhead',
      title: 'Overhead',
      items: [],
      color: 'text-purple-600'
    },
    {
      id: 'admin-cost',
      title: 'Admin Cost',
      items: [],
      color: 'text-orange-600'
    },
    {
      id: 'marketing-cost',
      title: 'Marketing Cost',
      items: [],
      color: 'text-red-600'
    },
    {
      id: 'other-cost',
      title: 'Other Costs',
      items: [],
      color: 'text-gray-600'
    }
  ]);

  const addCostItem = (categoryId: string) => {
    setCostCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        const newItem: CostItem = {
          id: `${categoryId}-${Date.now()}`,
          name: '',
          amount: 0,
          ...(category.isLaborCategory && {
            timePeriod: 'hourly',
            quantity: 1
          })
        };
        return {
          ...category,
          items: [...category.items, newItem]
        };
      }
      return category;
    }));
  };

  const removeCostItem = (categoryId: string, itemId: string) => {
    setCostCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          items: category.items.filter(item => item.id !== itemId)
        };
      }
      return category;
    }));
  };

  const updateCostItem = (categoryId: string, itemId: string, field: keyof CostItem, value: string | number) => {
    setCostCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          items: category.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                [field]: value
              };
            }
            return item;
          })
        };
      }
      return category;
    }));
  };

  const calculateItemTotal = (item: CostItem, category: CostCategory) => {
    if (category.isLaborCategory && item.timePeriod && item.quantity) {
      return item.amount * item.quantity;
    }
    return item.amount;
  };

  const getCategoryTotal = (category: CostCategory) => {
    return category.items.reduce((total, item) => total + calculateItemTotal(item, category), 0);
  };

  const getGrandTotal = () => {
    return costCategories.reduce((total, category) => total + getCategoryTotal(category), 0);
  };

  const getTimePeriodLabel = (timePeriod: string) => {
    switch (timePeriod) {
      case 'hourly': return 'per jam';
      case 'daily': return 'per hari';
      case 'monthly': return 'per bulan';
      default: return '';
    }
  };

  const getQuantityLabel = (timePeriod: string) => {
    switch (timePeriod) {
      case 'hourly': return 'Jam';
      case 'daily': return 'Hari';
      case 'monthly': return 'Bulan';
      default: return 'Jumlah';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {costCategories.map((category) => (
          <div key={category.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className={`font-semibold text-sm ${category.color}`}>
                {category.title}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addCostItem(category.id)}
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>

            {category.items.length > 0 && (
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div key={item.id} className="space-y-2 p-3 border rounded-lg bg-gray-50">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input
                          placeholder="Item name (e.g., Gula, Kopi, Pekerja)"
                          value={item.name}
                          onChange={(e) => updateCostItem(category.id, item.id, 'name', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCostItem(category.id, item.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex gap-2 items-center">
                      {category.isLaborCategory && (
                        <div className="w-32">
                          <Select
                            value={item.timePeriod || 'hourly'}
                            onValueChange={(value) => updateCostItem(category.id, item.id, 'timePeriod', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hourly">Per Jam</SelectItem>
                              <SelectItem value="daily">Per Hari</SelectItem>
                              <SelectItem value="monthly">Per Bulan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="w-32">
                        <Input
                          type="number"
                          placeholder={category.isLaborCategory ? "Rate" : "Amount"}
                          value={item.amount || ''}
                          onChange={(e) => updateCostItem(category.id, item.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                        {category.isLaborCategory && item.timePeriod && (
                          <div className="text-xs text-gray-500 mt-1">
                            {getTimePeriodLabel(item.timePeriod)}
                          </div>
                        )}
                      </div>

                      {category.isLaborCategory && (
                        <div className="w-24">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity || ''}
                            onChange={(e) => updateCostItem(category.id, item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            {getQuantityLabel(item.timePeriod || 'hourly')}
                          </div>
                        </div>
                      )}

                      {category.isLaborCategory && (
                        <div className="w-32 text-right">
                          <div className="text-sm font-medium">
                            Rp {calculateItemTotal(item, category).toLocaleString('id-ID')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Category Total */}
                <div className="bg-gray-50 p-2 rounded flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {category.title} Total:
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    Rp {getCategoryTotal(category).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}

            {category.items.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                No items added yet. Click "Add Item" to start.
              </div>
            )}
          </div>
        ))}

        <Separator />
        
        {/* Grand Total */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-blue-700">Total Production Cost:</span>
            <span className="text-xl font-bold text-blue-800">
              Rp {getGrandTotal().toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
