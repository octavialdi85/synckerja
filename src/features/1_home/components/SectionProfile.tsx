import React from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { Skeleton } from '@/features/ui/skeleton';
import { User, Calendar, Home, Coffee } from 'lucide-react';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { useEmployeeLeaveBalance } from '@/features/2-1-employees/MyInfo/LeavePermit/hooks/useEmployeeLeaveBalance';
import { SectionQuickMenu } from './HomeOKRDashboard/component/SectionQuickMenu';
import { EmployeeProfilePhoto } from '@/features/share/EmployeeProfilePhoto';
import { useAvatarSync } from '@/features/2-1-employees/MyInfo/LeavePermit/hooks/useAvatarSync';
import { useUserData } from '@/features/1-login/hooks/useUserData';
import { useTeamAvailability } from './useTeamAvailability';
import { toast } from 'sonner';

export const SectionProfile = () => {
  const {
    data: employeeData,
    isLoading,
    refetch: refetchEmployee
  } = useCurrentEmployee();
  const {
    data: leaveBalance
  } = useEmployeeLeaveBalance();
  const { profile, userRole } = useUserData();
  const { syncAvatarAcrossApp } = useAvatarSync();
  const { data: teamAvailability, isLoading: isTeamLoading } = useTeamAvailability();

  // Default data for fallback
  const defaultData = {
    name: "User",
    position: "Employee",
    division: "Development",
    workStatus: "WFO",
    remainingLeave: 12,
    perfectAttendance: true
  };

  // Get user role display text
  const getRoleDisplayText = (role: string | null) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'employee':
        return 'Employee';
      default:
        return defaultData.position;
    }
  };

  // Use real data if available, prioritizing profile data like header components
  const currentUser = {
    name: isLoading ? "Loading..." : (profile?.full_name || employeeData?.full_name || defaultData.name),
    position: getRoleDisplayText(userRole),
    division: isLoading ? "Loading..." : (employeeData?.departments?.name || defaultData.division),
    workStatus: defaultData.workStatus,
    remainingLeave: leaveBalance?.remainingLeave ?? employeeData?.leave_balance ?? defaultData.remainingLeave,
    totalLeave: leaveBalance?.totalAnnualLeave ?? 12,
    perfectAttendance: defaultData.perfectAttendance,
    photoUrl: employeeData?.profile_photo_url
  };

  // Removed excessive debug logging for performance

  const handlePhotoUpdate = async (photoUrl: string | null) => {
    try {
      console.log('🔄 SectionProfile: Starting photo update process');
      console.log('📸 New photo URL:', photoUrl);
      
      // Show loading toast
      const loadingToast = toast.loading('Memperbarui foto profil...');
      
      // Sync avatar across all app components
      const result = await syncAvatarAcrossApp(photoUrl);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if (result?.success) {
        // Wait a bit for database update to propagate
        setTimeout(async () => {
          console.log('🔄 Refetching employee data after photo update');
          await refetchEmployee();
        }, 500);
        
        toast.success('Foto profil berhasil diperbarui di seluruh aplikasi! 🎉');
        console.log('✅ SectionProfile: Photo sync completed successfully');
      } else {
        toast.error('Gagal menyinkronkan foto di seluruh aplikasi');
        console.error('❌ SectionProfile: Photo sync failed:', result?.error);
      }
    } catch (error) {
      console.error('❌ SectionProfile: Error during photo update:', error);
      toast.error('Gagal memperbarui foto profil');
    }
  };

  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <>
      <div className="flex flex-col h-full gap-2">
        {/* Profile Card */}
        <Card className="p-4 flex-shrink-0">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3 mb-4">
              <EmployeeProfilePhoto
                employeeName={currentUser.name}
                employeeId={employeeData?.id}
                photoUrl={currentUser.photoUrl}
                size="sm"
                onPhotoUpdate={handlePhotoUpdate}
              />
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-snug">{currentUser.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{currentUser.position}</p>
                <p className="text-xs text-gray-500 leading-normal">{currentUser.division}</p>
              </div>
            </div>
            
            {/* Employee Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-xs text-gray-700 leading-relaxed">Employee ID:</span>
                </div>
                <span className="text-xs font-semibold text-blue-600 leading-normal">{employeeData?.employee_id || 'N/A'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs text-gray-700 leading-relaxed">Join Date:</span>
                </div>
                <span className="text-xs font-semibold text-green-600 leading-normal">
                  {employeeData?.join_date || employeeData?.hire_date 
                    ? new Date(employeeData.join_date || employeeData.hire_date).toLocaleDateString('id-ID')
                    : 'N/A'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coffee className="h-4 w-4" />
                  <span className="text-xs text-gray-700 leading-relaxed">Sisa Cuti:</span>
                </div>
                <span className="text-xs font-semibold text-orange-600 leading-normal">
                  {currentUser.remainingLeave} hari
                  <span className="text-xs text-gray-500 ml-1 leading-normal">
                    dari {currentUser.totalLeave} hari/tahun
                  </span>
                </span>
              </div>

              {employeeData?.branch_id && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Home className="h-4 w-4" />
                    <span className="text-sm">Branch:</span>
                  </div>
                  <span className="font-semibold text-purple-600">Head Office</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Absensi Online - Flex Grow untuk mengisi sisa space */}
        <div className="flex-1 min-h-0">
          <SectionQuickMenu 
            isTeamLoading={isTeamLoading}
            displayTeamData={teamAvailability || []}
          />
        </div>

      </div>
    </>
  );
};
