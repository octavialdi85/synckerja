
import { useState, useEffect } from 'react';
import { Badge } from '@/features/ui/badge';
import { Package, DollarSign, Building, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { Button } from '@/features/ui/button';
import { MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useToast } from '@/features/ui/use-toast';

interface ProductManagerTableProps {
  refreshTrigger?: number;
}

export const ProductManagerTable = ({ refreshTrigger }: ProductManagerTableProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { organizationId } = useCurrentOrg();
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, [organizationId, refreshTrigger]);

  const fetchProducts = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          sku,
          category,
          price,
          cost,
          stock_quantity,
          min_stock_level,
          status,
          department_id,
          created_at,
          updated_at
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive"
        });
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatToRupiah = (amount: number | null) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewDetails = (product: any) => {
    console.log('View details for product:', product.id);
  };

  const handleEdit = (product: any) => {
    console.log('Edit product:', product.id);
  };

  const handleDelete = async (product: any) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
      
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Product Manager</h3>
          <p className="text-xs text-slate-500">Manage products and pricing information</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800 mb-1">Product Manager</h3>
        <p className="text-xs text-slate-500">Manage products and pricing information</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Product Name</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Category</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Price</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">SKU</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Status</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Department</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Created Date</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wide text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium leading-tight text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">Product</p>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-slate-100">
                      <Package className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <span className="text-xs text-slate-600">{product.category}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900">{formatToRupiah(product.price)}</p>
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">
                    {product.sku}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge className={`text-xs ${getStatusColor(product.status)}`}>
                    {product.status}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-slate-100">
                      <Building className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <span className="text-xs text-slate-600">{product.department_id || 'N/A'}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-slate-100">
                      <Calendar className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <span className="text-xs text-slate-600">
                      {format(new Date(product.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </td>
                <td className="p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(product)}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(product)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(product)} className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-500 mb-2">No products found</p>
            <p className="text-xs text-slate-400">Create your first product to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};
