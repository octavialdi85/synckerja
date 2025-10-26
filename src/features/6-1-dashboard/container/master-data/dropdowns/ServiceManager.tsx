
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { Button } from '@/features/ui/button';
import { MoreVertical, Plus, Edit, Trash2, Lock } from 'lucide-react';
import { useMasterData } from '../../../hook/useMasterData';
import { Service } from '@/types/social-media';

interface ServiceManagerProps {
  onDataChange: () => void;
}

export const ServiceManager: React.FC<ServiceManagerProps> = ({ onDataChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    item: Service | null;
  }>({
    open: false,
    mode: 'add',
    item: null
  });

  const [services, setServices] = useState<Service[]>([]);
  const { loading, fetchData, addData, updateData, deleteData } = useMasterData('services');

  // Stable load function
  const loadServices = useCallback(async () => {
    console.log('Loading services...');
    const data = await fetchData();
    console.log('Services loaded:', data);
    setServices(data as Service[]);
  }, [fetchData]);

  // Load data only once on mount
  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleAdd = useCallback(() => {
    setModalData({
      open: true,
      mode: 'add',
      item: null
    });
    setIsOpen(false);
  }, []);

  const handleEdit = useCallback((item: Service) => {
    setModalData({
      open: true,
      mode: 'edit',
      item
    });
    setIsOpen(false);
  }, []);

  const handleDelete = useCallback(async (item: Service) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      const success = await deleteData(item.id, item.name);
      if (success) {
        await loadServices();
        onDataChange();
      }
    }
    setIsOpen(false);
  }, [deleteData, loadServices, onDataChange]);

  const handleSave = useCallback(async (name: string) => {
    let success = false;
    
    if (modalData.mode === 'add') {
      success = await addData(name);
    } else if (modalData.item) {
      success = await updateData(modalData.item.id, name);
    }

    if (success) {
      await loadServices();
      onDataChange();
      setModalData({ open: false, mode: 'add', item: null });
    }
  }, [modalData, addData, updateData, loadServices, onDataChange]);

  const handleCloseModal = useCallback(() => {
    setModalData({ open: false, mode: 'add', item: null });
  }, []);

  const handleSaveClick = useCallback(() => {
    // Get the name from the input field
    const input = document.querySelector('input[placeholder="Enter service name"]') as HTMLInputElement;
    if (input?.value) {
      handleSave(input.value);
    }
  }, [handleSave]);

  // Separate default and custom services
  const defaultServices = (services || []).filter(item => !item.organization_id);
  const customServices = (services || []).filter(item => item.organization_id);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-80 bg-white border shadow-lg z-[1000001] p-0 flex flex-col">
          {/* Sticky Header - Add Button */}
          <div className="sticky top-0 bg-white z-10 border-b">
            <DropdownMenuItem onClick={handleAdd} className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </DropdownMenuItem>
          </div>
          
          {/* Scrollable Content */}
          <div className="overflow-y-auto seamless-scroll max-h-[calc(20rem-41px)]">
          {(defaultServices.length > 0 || customServices.length > 0) && (
            <>
              <DropdownMenuSeparator />
              
              {/* Default Services */}
              {defaultServices.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                    Default Services (Read-only)
                  </div>
                  {defaultServices.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-2 py-2 bg-gray-50/50">
                      <div className="flex items-center flex-1 min-w-0">
                        <Lock className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Custom Services */}
              {customServices.length > 0 && (
                <>
                  {defaultServices.length > 0 && <DropdownMenuSeparator />}
                  <div className="px-2 py-1 text-xs font-medium text-gray-500">
                    Custom Services
                  </div>
                  {customServices.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-50">
                      <span className="text-sm truncate flex-1 mr-2">{item.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-blue-100"
                          onClick={() => handleEdit(item)}
                          title="Edit"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100"
                          onClick={() => handleDelete(item)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Show message if no custom services */}
              {customServices.length === 0 && defaultServices.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2 text-xs text-gray-500 text-center italic">
                    No custom services yet
                  </div>
                </>
              )}

              {/* Show message if no data at all */}
              {defaultServices.length === 0 && customServices.length === 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2 text-xs text-gray-500 text-center italic">
                    No services available
                  </div>
                </>
              )}
            </>
          )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {modalData.open && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg w-96 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Service</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={modalData.item?.name || ''}
                  onChange={(e) => setModalData(prev => ({
                    ...prev,
                    item: { ...prev.item!, name: e.target.value }
                  }))}
                  className="w-full p-2 border rounded"
                  placeholder="Enter service name"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveClick}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
