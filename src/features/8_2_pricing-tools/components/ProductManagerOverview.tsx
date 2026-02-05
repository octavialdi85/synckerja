
import { useState, useEffect } from 'react';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export const ProductManagerOverview = () => {
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    activeProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const { organizationId } = useCurrentOrg();

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch top products (highest price)
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, category, price, status')
        .eq('organization_id', organizationId)
        .order('price', { ascending: false })
        .limit(3);

      if (error) {
        return;
      }

      // Fetch all products for metrics
      const { data: allProducts, error: allError } = await supabase
        .from('products')
        .select('id, status')
        .eq('organization_id', organizationId);

      if (allError) {
        return;
      }

      setTopProducts(products || []);
      setMetrics({
        totalProducts: allProducts?.length || 0,
        activeProducts: allProducts?.filter(p => p.status === 'active').length || 0
      });
    } catch {
      // Fetch failed - metrics stay at default
    } finally {
      setLoading(false);
    }
  };

  const formatToRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-lg h-full">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-gray-900">Product Overview</h3>
          <p className="text-xs text-gray-500 mt-1">Loading product data...</p>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-gray-900">Product Overview</h3>
        <p className="text-xs text-gray-500 mt-1">Top performing products and metrics</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-800">Total Products</p>
                <p className="text-lg font-bold text-blue-900">{metrics.totalProducts}</p>
              </div>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-800">Active Products</p>
                <p className="text-lg font-bold text-green-900">{metrics.activeProducts}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>

        {/* Top Products List */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            Top Products by Value
          </h4>
          
          {topProducts.length === 0 ? (
            <div className="text-center py-6">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((product) => (
                <div key={product.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {product.category}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-medium text-gray-900">
                        {formatToRupiah(product.price || 0)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-1 pt-1 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                      High-value product
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full p-2 text-xs text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              Add New Product
            </button>
            <button className="w-full p-2 text-xs text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              Bulk Price Update
            </button>
            <button className="w-full p-2 text-xs text-left bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
              Export Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
