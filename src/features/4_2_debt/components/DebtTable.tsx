import { useState, useMemo } from 'react';
import { Debt } from '../types';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Badge } from '@/features/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { Search, MoreHorizontal, Eye, Edit, Trash2, CreditCard, Building, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DebtTableProps {
  debts: Debt[];
  isLoading?: boolean;
  onEdit?: (debt: Debt) => void;
  onDelete?: (debtId: string) => void;
  onViewDetails?: (debt: Debt) => void;
}

export const DebtTable = ({ 
  debts, 
  isLoading = false,
  onEdit,
  onDelete,
  onViewDetails
}: DebtTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredDebts = useMemo(() => {
    return debts.filter(debt => {
      const matchesSearch = 
        debt.debt_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        debt.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        debt.debt_type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'all' || debt.debt_type === filterType;
      const matchesStatus = filterStatus === 'all' || debt.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [debts, searchQuery, filterType, filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
            Aktif
          </Badge>
        );
      case 'paid_off':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
            Lunas
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5 rounded-full">
            Ditutup
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5 rounded-full">
            {status}
          </Badge>
        );
    }
  };

  const calculateUtilization = (limit: number, used: number) => {
    if (limit === 0) return 0;
    return Math.round((used / limit) * 100);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-orange-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col min-w-0 flex-1 h-full">
      {/* Table Header with Search and Filters */}
      <div className="px-2 sm:px-3 py-2 border-b bg-gray-50 flex-shrink-0 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 min-w-0">
          <div className="flex items-center flex-wrap gap-2 min-w-0 flex-1">
            <div className="relative min-w-0 flex-1 sm:flex-initial">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cari hutang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 w-full sm:w-48 md:w-64 min-w-0"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40 md:w-48 min-w-0">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="Kartu Kredit">Kartu Kredit</SelectItem>
                <SelectItem value="Pinjaman Bank">Pinjaman Bank</SelectItem>
                <SelectItem value="Hutang Supplier">Hutang Supplier</SelectItem>
                <SelectItem value="Pinjaman Online">Pinjaman Online</SelectItem>
                <SelectItem value="Hutang Pribadi">Hutang Pribadi</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-32 md:w-40 min-w-0">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="paid_off">Lunas</SelectItem>
                <SelectItem value="closed">Ditutup</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 min-w-0 seamless-scroll overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[1600px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Nama Hutang</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Tipe</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Bank/Institusi</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Total Limit</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Limit Tersedia</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Terpakai</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Hutang</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Utilization</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Bunga (%)</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Jatuh Tempo</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Status</th>
              <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-700 whitespace-nowrap text-xs sm:text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebts.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-gray-500">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">Tidak ada data hutang</p>
                  <p className="text-xs text-gray-400">Tambahkan hutang pertama Anda untuk memulai</p>
                </td>
              </tr>
            ) : (
              filteredDebts.map((debt) => {
                const utilization = calculateUtilization(debt.limit_amount, debt.used_amount);
                return (
                  <tr key={debt.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[200px] min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="p-1.5 rounded-md bg-blue-50 flex-shrink-0">
                          <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 truncate text-xs sm:text-sm">
                            {debt.debt_name}
                          </div>
                          {debt.description && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {debt.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      <Badge variant="outline" className="text-xs">
                        {debt.debt_type}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 max-w-[150px] min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-gray-100">
                          <Building className="h-3 w-3 text-gray-600" />
                        </div>
                        <span className="text-xs sm:text-sm text-gray-700 truncate">
                          {debt.bank_name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium whitespace-nowrap text-xs sm:text-sm">
                      {formatToRupiah(debt.limit_amount)}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium whitespace-nowrap text-xs sm:text-sm text-green-600">
                      {formatToRupiah(debt.available_limit ?? (debt.limit_amount - debt.used_amount))}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium whitespace-nowrap text-xs sm:text-sm text-orange-600">
                      {formatToRupiah(debt.used_amount)}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-bold whitespace-nowrap text-xs sm:text-sm text-red-600">
                      {formatToRupiah(debt.debt_amount)}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 min-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getUtilizationColor(utilization)}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {utilization}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      {debt.interest_rate ? `${debt.interest_rate}%` : '-'}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap text-xs sm:text-sm">
                      {debt.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {format(new Date(debt.due_date), 'dd MMM yyyy')}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                      {getStatusBadge(debt.status)}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                            <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {onViewDetails && (
                            <DropdownMenuItem onClick={() => onViewDetails(debt)}>
                              <Eye className="h-4 w-4 mr-2 text-gray-600" />
                              Detail
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(debt)}>
                              <Edit className="h-4 w-4 mr-2 text-gray-600" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => onDelete(debt.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-2 sm:px-3 py-2 border-t bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>
            Menampilkan {filteredDebts.length} dari {debts.length} hutang
          </span>
          <div className="flex items-center gap-4">
            <span>
              Total Hutang: <span className="font-bold text-red-600">
                {formatToRupiah(filteredDebts.reduce((sum, d) => sum + d.debt_amount, 0))}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
