
import { useState } from 'react';
import { Search, Filter, Plus, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Button } from '@/features/ui/button';
import { ProductCreateDialog } from './ProductCreateDialog';

interface ProductManagerFiltersProps {
  onProductsRefresh?: () => void;
}

export const ProductManagerFilters = ({ onProductsRefresh }: ProductManagerFiltersProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/60 p-3 mb-3 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <Select>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="physical">Physical Item</SelectItem>
            <SelectItem value="digital">Digital</SelectItem>
            <SelectItem value="service">Service</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter */}
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
          <Filter className="h-3 w-3 mr-1" />
          Date
        </Button>

        {/* Department Filter */}
        <Select>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
          </SelectContent>
        </Select>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <Button 
            size="sm" 
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Product
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-slate-200">
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <ProductCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          onProductsRefresh?.();
        }}
      />
    </div>
  );
};
