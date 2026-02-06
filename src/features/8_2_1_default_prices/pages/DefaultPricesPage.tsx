import { useState, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { PricingToolsHeaderAndTab } from '@/features/8_2_pricing-tools/components';
import { Button } from '@/features/ui/button';
import { Plus } from 'lucide-react';
import { useDefaultPrices } from '../hooks';
import { DefaultPricesTable, DefaultPriceFormDialog } from '../components';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import type { DefaultPriceRow, DefaultPriceCreate, DefaultPriceUpdate } from '../types';

const DefaultPricesPage = () => {
  const [activeTab, setActiveTab] = useState('default-prices');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DefaultPriceRow | null>(null);

  const { organizationId } = useCurrentOrg();
  const {
    rows,
    isLoading,
    create,
    update,
    delete: deleteRow,
    isCreating,
    isUpdating,
  } = useDefaultPrices();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingRow(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: DefaultPriceRow) => {
    setEditingRow(row);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (payload: DefaultPriceCreate) => {
      if (editingRow) {
        await update({ id: editingRow.id, payload: { unit_price: payload.unit_price } as DefaultPriceUpdate });
      } else {
        await create(payload);
      }
      setDialogOpen(false);
      setEditingRow(null);
    },
    [editingRow, create, update]
  );

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0 mb-1">
                <PricingToolsHeaderAndTab activeTab={activeTab} onTabChange={handleTabChange} />
              </div>

              <div className="flex-1 min-h-0">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-full overflow-y-auto seamless-scroll px-4 py-6 max-h-[calc(100vh-120px)]">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Default Prices</h2>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Set default unit price per Service + Category. Used to auto-fill amount when a lead is converted (Leads Management).
                          </p>
                        </div>
                        <Button onClick={handleAdd} disabled={!organizationId || isCreating}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                      <DefaultPricesTable
                        rows={rows}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onDelete={deleteRow}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DefaultPriceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editingRow={editingRow}
      />
    </StandardLayout>
  );
};

export default DefaultPricesPage;
