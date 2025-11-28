
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle } from 'lucide-react';

const mockSalesData = [
  { month: 'Jan', revenue: 120000000, profit: 36000000 },
  { month: 'Feb', revenue: 135000000, profit: 40500000 },
  { month: 'Mar', revenue: 148000000, profit: 44400000 },
  { month: 'Apr', revenue: 162000000, profit: 48600000 },
  { month: 'May', revenue: 155000000, profit: 46500000 },
  { month: 'Jun', revenue: 178000000, profit: 53400000 },
];

const mockProductData = [
  { name: 'Product A', margin: 35, sales: 1250 },
  { name: 'Product B', margin: 28, sales: 980 },
  { name: 'Product C', margin: 42, sales: 750 },
  { name: 'Product D', margin: 18, sales: 2100 },
];

const mockChannelData = [
  { name: 'Online', value: 65, color: '#3B82F6' },
  { name: 'Offline', value: 35, color: '#10B981' },
];

export const PricingDashboard = () => {
  return (
    <div className="space-y-2">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">Rp 1.8B</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+12.5%</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Profit Margin</p>
                <p className="text-2xl font-bold">32.4%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+2.1%</span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-2xl font-bold">47</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">-3 this month</span>
                </div>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Margin Alert</p>
                <p className="text-2xl font-bold">3</p>
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 text-orange-600" />
                  <span className="text-xs text-orange-600">Need review</span>
                </div>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Revenue & Profit Trend</CardTitle>
              <Button variant="outline" size="sm">View Details</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `Rp ${(value as number).toLocaleString('id-ID')}`} />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                <Bar dataKey="profit" fill="#10B981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Sales Channel Distribution</CardTitle>
              <Button variant="outline" size="sm">Analyze</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockChannelData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {mockChannelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Product Performance Analysis</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Export</Button>
              <Button variant="outline" size="sm">Filter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Product</th>
                  <th className="text-left p-2 font-medium">Profit Margin</th>
                  <th className="text-left p-2 font-medium">Monthly Sales</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {mockProductData.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{product.name}</td>
                    <td className="p-2">
                      <Badge 
                        variant={product.margin > 30 ? "default" : product.margin > 20 ? "secondary" : "destructive"}
                      >
                        {product.margin}%
                      </Badge>
                    </td>
                    <td className="p-2">{product.sales} units</td>
                    <td className="p-2">
                      <Badge 
                        variant={product.margin > 30 ? "default" : product.margin > 20 ? "secondary" : "destructive"}
                      >
                        {product.margin > 30 ? "Excellent" : product.margin > 20 ? "Good" : "Review Needed"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm">View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI-Powered Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Increase Product A Margin</p>
                <p className="text-sm text-blue-700">
                  Consider raising the price by 8% - market analysis shows customers are willing to pay more
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Review Product D Costs</p>
                <p className="text-sm text-orange-700">
                  Low margin alert - analyze production costs or adjust pricing strategy
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Optimize Channel Mix</p>
                <p className="text-sm text-green-700">
                  Focus more on offline sales - 12% higher profit margin compared to online channels
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
