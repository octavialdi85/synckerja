import { useState, useCallback, useMemo } from 'react';
import { HeaderAndTab } from '../4_2_dashboard/HeaderAndTab';
import { Card, CardContent } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Plus } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useDebts } from './hooks';
import { DebtTable, DebtForm } from './components';
import { Debt, CreateDebtData, UpdateDebtData } from './types';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';

export const DebtPage = () => {
  const [activeTab, setActiveTab] = useState('debt');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const { t } = useAppTranslation();
  const { debts, isLoading, isCreating, isUpdating, createDebt, updateDebt, deleteDebt } = useDebts();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleAddClick = () => {
    setEditingDebt(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (debt: Debt) => {
    setEditingDebt(debt);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (debtId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus hutang ini?')) {
      await deleteDebt(debtId);
    }
  };

  const handleViewDetails = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsDetailModalOpen(true);
  };

  const handleFormSubmit = async (data: CreateDebtData): Promise<boolean> => {
    if (editingDebt) {
      const updateData: UpdateDebtData = {
        id: editingDebt.id,
        ...data,
      };
      return await updateDebt(updateData);
    } else {
      return await createDebt(data);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDebt(null);
  };

  // Calculate totals
  const totalDebt = useMemo(() => {
    return debts.reduce((sum, debt) => sum + debt.debt_amount, 0);
  }, [debts]);

  const totalLimit = useMemo(() => {
    return debts.reduce((sum, debt) => sum + debt.limit_amount, 0);
  }, [debts]);

  const totalUsed = useMemo(() => {
    return debts.reduce((sum, debt) => sum + debt.used_amount, 0);
  }, [debts]);

  const activeDebts = useMemo(() => {
    return debts.filter(d => d.status === 'active');
  }, [debts]);

  const activeDebtTotal = useMemo(() => {
    return activeDebts.reduce((sum, debt) => sum + debt.debt_amount, 0);
  }, [activeDebts]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 px-2 sm:px-4 pb-4 min-w-0">
          <div className="h-full flex flex-col overflow-hidden min-w-0">
            {/* Header and Tabs */}
            <div className="flex-shrink-0 mb-1 min-w-0">
              <HeaderAndTab 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
              />
            </div>
            
            {/* Content Area - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)] min-w-0">
              <div className="p-2 bg-gradient-to-br from-gray-50 to-white min-h-full flex flex-col min-w-0">
                {/* Header Card */}
                <Card className="mb-4 bg-blue-600 text-white border-0 w-full min-w-0">
                  <CardContent className="p-3 min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-semibold mb-1 text-white truncate">
                          {t('debt.title', 'Manajemen Hutang')}
                        </h1>
                        <p className="text-blue-100 text-xs sm:text-sm truncate">
                          {t('debt.description', 'Kelola dan lacak catatan hutang')}
                        </p>
                      </div>
                      <Button 
                        onClick={handleAddClick}
                        className="bg-white text-blue-600 hover:bg-blue-50 flex-shrink-0"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Tambah Hutang</span>
                        <span className="sm:hidden">Tambah</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2 min-w-0">
                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Total Hutang</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate text-red-600">
                        {formatToRupiah(totalDebt)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {debts.length} hutang
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Total Limit</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate">
                        {formatToRupiah(totalLimit)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        Total plafon
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Total Terpakai</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate text-orange-600">
                        {formatToRupiah(totalUsed)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0}% dari limit
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0">
                    <CardContent className="p-3 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 mb-1 truncate">Hutang Aktif</div>
                      <div className="text-xl sm:text-2xl font-bold mb-1 truncate text-red-600">
                        {formatToRupiah(activeDebtTotal)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {activeDebts.length} hutang aktif
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Table Section */}
                <div className="flex-1 min-h-0">
                  <DebtTable
                    debts={debts}
                    isLoading={isLoading}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    onViewDetails={handleViewDetails}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      <DebtForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingDebt || undefined}
        isLoading={isCreating || isUpdating}
      />

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto min-w-0">
          <DialogHeader>
            <DialogTitle>Detail Hutang</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang hutang ini
            </DialogDescription>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Hutang</label>
                  <p className="text-sm font-semibold mt-1">{selectedDebt.debt_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipe</label>
                  <p className="text-sm mt-1">{selectedDebt.debt_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Bank/Institusi</label>
                  <p className="text-sm mt-1">{selectedDebt.bank_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm mt-1">
                    {selectedDebt.status === 'active' ? 'Aktif' : 
                     selectedDebt.status === 'paid_off' ? 'Lunas' : 'Ditutup'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Limit</label>
                  <p className="text-sm font-semibold mt-1">{formatToRupiah(selectedDebt.limit_amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Terpakai</label>
                  <p className="text-sm font-semibold mt-1 text-orange-600">
                    {formatToRupiah(selectedDebt.used_amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Hutang</label>
                  <p className="text-sm font-bold mt-1 text-red-600">
                    {formatToRupiah(selectedDebt.debt_amount)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Utilization</label>
                  <p className="text-sm mt-1">
                    {Math.round((selectedDebt.used_amount / selectedDebt.limit_amount) * 100)}%
                  </p>
                </div>
                {selectedDebt.interest_rate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Bunga</label>
                    <p className="text-sm mt-1">{selectedDebt.interest_rate}% per tahun</p>
                  </div>
                )}
                {selectedDebt.due_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Jatuh Tempo</label>
                    <p className="text-sm mt-1">
                      {new Date(selectedDebt.due_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                )}
                {selectedDebt.minimum_payment && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Minimum Payment</label>
                    <p className="text-sm mt-1">{formatToRupiah(selectedDebt.minimum_payment)}</p>
                  </div>
                )}
              </div>
              {selectedDebt.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Deskripsi</label>
                  <p className="text-sm mt-1">{selectedDebt.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">Dibuat</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedDebt.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Diperbarui</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedDebt.updated_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtPage;
