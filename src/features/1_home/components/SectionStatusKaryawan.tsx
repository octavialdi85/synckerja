import React, { useState } from 'react';
import { Clock, MapPin, Edit3, Trash2, MoreHorizontal } from 'lucide-react';
import { UnifiedAvatar } from '@/features/share/UnifiedAvatar';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/features/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/features/ui/alert-dialog';
import { ModalStatusKaryawan } from './ModalStatusKaryawan';
import { useEmployeeStatus, EmployeeStatus } from './useEmployeeStatus';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface SectionStatusKaryawanProps {
  statusCreatedTrigger?: number;
}

export const SectionStatusKaryawan = ({ statusCreatedTrigger }: SectionStatusKaryawanProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusCreatedCount, setStatusCreatedCount] = useState(0);
  const [editingStatus, setEditingStatus] = useState<EmployeeStatus | null>(null);
  const [deleteStatusId, setDeleteStatusId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { statuses, loading, refetch, deleteStatus, updateStatus } = useEmployeeStatus();
  const { data: currentEmployee } = useCurrentEmployee();

  // Listen for status creation to trigger refetch
  React.useEffect(() => {
    if (statusCreatedTrigger && statusCreatedTrigger > 0) {
      console.log('🔄 SectionStatusKaryawan: Triggering refetch due to status creation');
      refetch();
    }
  }, [statusCreatedTrigger]);

  const handleCreateStatus = () => {
    setIsModalOpen(true);
  };

  const handleStatusCreated = () => {
    setStatusCreatedCount(prev => prev + 1);
    refetch();
  };

  const handleEditStatus = (status: EmployeeStatus) => {
    setEditingStatus(status);
    setIsModalOpen(true);
  };

  const handleDeleteStatus = async (statusId: string) => {
    setIsDeleting(true);
    try {
      const success = await deleteStatus(statusId);
      if (success) {
        setDeleteStatusId(null);
        refetch();
      }
    } catch (error) {
      console.error('Error deleting status:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingStatus(null);
  };

  const handleStatusUpdated = () => {
    setEditingStatus(null);
    refetch();
  };

  // Check if current user can edit/delete a status
  const canEditStatus = (status: EmployeeStatus) => {
    // Only allow editing if the current user is the owner of the status
    return currentEmployee && status.employee_id === (currentEmployee as any).id;
  };

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: id 
      });
    } catch (error) {
      return 'Baru saja';
    }
  };

  // Helper function to get location display name
  const getLocationDisplayName = (location: string) => {
    const locationMap: { [key: string]: string } = {
      'kantor-pusat': 'Kantor Pusat Jakarta',
      'meeting-a': 'Ruang Meeting A',
      'meeting-b': 'Ruang Meeting B',
      'pantry': 'Pantry',
      'dev-room': 'Dev Room',
      'design-studio': 'Design Studio',
      'remote': 'Remote/WFH'
    };
    return locationMap[location] || location;
  };

  // Helper function to get status color
  const getStatusColor = (statusType: string) => {
    const colorMap: { [key: string]: string } = {
      'work': 'bg-blue-100 text-blue-800',
      'meeting': 'bg-purple-100 text-purple-800',
      'break': 'bg-yellow-100 text-yellow-800',
      'lunch': 'bg-orange-100 text-orange-800',
      'training': 'bg-green-100 text-green-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return colorMap[statusType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white border rounded-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-pink-100 rounded flex items-center justify-center">
            <span className="text-pink-600 text-sm">👤</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 leading-snug">Status Karyawan</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 leading-relaxed">
            {loading ? 'Loading...' : `${statuses.length} Update Terbaru`}
          </span>
          <Button
            onClick={handleCreateStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium leading-normal"
          >
            + Buat Status
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading status updates...</div>
          </div>
        ) : statuses.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Belum ada status update</div>
          </div>
        ) : (
          /* Horizontal scroll container */
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex space-x-4 pb-2" style={{ width: 'max-content' }}>
              {statuses.map((status) => (
                <div key={status.id} className="w-80 flex-shrink-0 bg-gray-50 border rounded-md p-4 relative">
                  {/* Action Menu */}
                  {canEditStatus(status) && (
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            onClick={() => handleEditStatus(status)}
                            className="cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteStatusId(status.id)}
                            className="cursor-pointer text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 mb-4">
                    <UnifiedAvatar 
                      photoUrl={status.employees?.profile_photo_url} 
                      name={status.employees?.full_name || 'Unknown'} 
                      size="md" 
                    />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 leading-normal">
                        {status.employees?.full_name || 'Unknown'}
                      </h4>
                      <p className="text-xs text-gray-500 leading-normal">
                        {status.employees?.departments?.name || 'Unknown Department'}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4 leading-relaxed line-clamp-3">{status.status_text}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span className="leading-normal">{getTimeAgo(status.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span className="leading-normal">{getLocationDisplayName(status.location)}</span>
                    </div>
                  </div>
                  
                  {/* Status type badge */}
                  <div className="mt-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs font-medium px-2 py-1 rounded-full leading-tight ${getStatusColor(status.status_type)}`}
                    >
                      {status.status_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Status Modal */}
      <ModalStatusKaryawan
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onStatusCreated={handleStatusCreated}
        onStatusUpdated={handleStatusUpdated}
        editingStatus={editingStatus}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStatusId} onOpenChange={() => setDeleteStatusId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Status</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus status ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStatusId && handleDeleteStatus(deleteStatusId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


