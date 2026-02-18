import { useState, useEffect } from "react";
import { AttendanceHeader } from "@/mobile/components/AttendanceHeader";
import { TimeDisplay } from "@/mobile/components/TimeDisplay";
import { LocationChecker, LocationButton } from "@/mobile/components/LocationChecker";
import { AttendanceStatus } from "@/mobile/components/AttendanceStatus";
import { AttendanceActions } from "@/mobile/components/AttendanceActions";
import { TodaySchedule } from "@/mobile/components/TodaySchedule";
import { NavigationFooter } from "@/mobile/components/NavigationFooter";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { CameraModal } from "@/mobile/components/CameraModal";
import { LateAttendanceModal } from "@/mobile/components/LateAttendanceModal";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { useToast } from "@/features/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/config/logger";
import { useAttendanceData } from "@/mobile/hooks/useAttendanceData";
import { RealtimeStatusIndicator } from "@/mobile/components/RealtimeStatusIndicator";
import { useRealtimePresence } from "@/mobile/hooks/useRealtimePresence";
import { useVisualViewport } from "@/mobile/hooks/useVisualViewport";
import { useStatusBarStyle } from "@/mobile/hooks/useStatusBarStyle";
import { LiveChatAppBadgeSync } from "@/features/5-3-whatsapp/components/LiveChatAppBadgeSync";
import { getCurrentPosition } from "@/mobile/utils/geolocation";
let confetti: any;
try {
  // Optional import to avoid build error if package not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  confetti = require("canvas-confetti");
} catch {}

const Absensi = () => {
  useStatusBarStyle('light');
  const { toast } = useToast();
  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    type: 'clockin' | 'clockout' | null;
  }>({
    isOpen: false,
    type: null
  });
  const [lateModal, setLateModal] = useState<{
    isOpen: boolean;
    lateMinutes: number;
    scheduledTime: string;
    pendingClockIn: boolean;
  }>({
    isOpen: false,
    lateMinutes: 0,
    scheduledTime: '',
    pendingClockIn: false
  });
  
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  
  const {
    todayAttendance,
    officeLocation,
    todaySchedule,
    workSchedule,
    loading,
    realtimeConnected,
    refetch
  } = useAttendanceData();

  // UX: cap skeleton to a short duration to avoid feeling "stuck"
  const [showSkeleton, setShowSkeleton] = useState(true);
  useEffect(() => {
    if (loading) {
      setShowSkeleton(true);
      const id = setTimeout(() => setShowSkeleton(false), 1200);
      return () => clearTimeout(id);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);

  // Setup user presence tracking
  const { onlineUsers, totalOnline } = useRealtimePresence(organizationId, currentUser || undefined);

  // Get current user info for presence tracking
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('full_name, active_organization_id')
          .eq('user_id', user.id)
          .single();
        type ProfileSlice = { full_name: string | null; active_organization_id: string | null };
        const profileData = data as unknown as ProfileSlice | null;
        if (profileData) {
          setCurrentUser({
            id: user.id,
            name: profileData.full_name ?? user.email ?? 'Unknown'
          });
          setOrganizationId(profileData.active_organization_id ?? '');
        }
      } catch (error) {
        logger.error('Absensi getCurrentUser:', error);
        toast({
          title: 'Error',
          description: 'Gagal memuat info pengguna',
          variant: 'destructive',
        });
      }
    };
    getCurrentUser();
  }, [toast]);

  // Force refresh data when component mounts or when organization might change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refetch data when user returns to tab (might have switched organization)
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  const triggerConfetti = () => {
    // Multiple confetti bursts for celebration effect
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    };
    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    // First burst
    fire(0.25, {
      spread: 26,
      startVelocity: 55
    });

    // Second burst
    fire(0.2, {
      spread: 60
    });

    // Third burst
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });

    // Fourth burst
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    // Fifth burst
    fire(0.1, {
      spread: 120,
      startVelocity: 45
    });
  };

  // Fungsi untuk menghitung jam kerja real-time
  const calculateWorkingHours = () => {
    if (!todayAttendance?.check_in_time) {
      return "0 jam 0 menit";
    }
    const checkInTime = new Date(todayAttendance.check_in_time);
    const endTime = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : new Date();
    const diffMs = endTime.getTime() - checkInTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} jam ${minutes} menit`;
  };

  const handleClockIn = () => {
    if (todayAttendance?.check_in_time) {
        toast({
          title: "Sudah Clock In",
          description: "Anda sudah melakukan clock in hari ini",
          variant: "destructive",
          duration: 4000,
        });
      return;
    }

    // Check if today is a working day
    if (todaySchedule && !todaySchedule.isWorkingDay) {
      toast({
        title: "Hari Libur",
        description: "Hari ini adalah hari libur sesuai jadwal kerja",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Check if current time is within work hours (with late tolerance)
    if (workSchedule) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // in minutes
      const startTime = workSchedule.start_time ? parseInt(workSchedule.start_time.split(':')[0]) * 60 + parseInt(workSchedule.start_time.split(':')[1]) : 8 * 60; // default 8:00 AM
      const endTime = workSchedule.end_time ? parseInt(workSchedule.end_time.split(':')[0]) * 60 + parseInt(workSchedule.end_time.split(':')[1]) : 17 * 60; // default 5:00 PM
      const lateToleranceMinutes = workSchedule.late_tolerance_minutes || 0;

      // Check if too early (more than 1 hour before start time)
      if (currentTime < startTime - 60) {
        toast({
          title: "Terlalu Dini",
          description: `Waktu clock in belum dimulai. Jadwal kerja mulai ${workSchedule.start_time}`,
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Check if too late (after end time)
      if (currentTime > endTime) {
        toast({
          title: "Waktu Kerja Berakhir",
          description: `Waktu kerja sudah berakhir jam ${workSchedule.end_time}`,
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Show late warning if applicable
      if (currentTime > startTime + lateToleranceMinutes) {
        const lateMinutes = currentTime - startTime;
        setLateModal({
          isOpen: true,
          lateMinutes,
          scheduledTime: workSchedule.start_time || '08:00',
          pendingClockIn: true
        });
        return;
      }
    }
    setCameraModal({
      isOpen: true,
      type: 'clockin'
    });
  };

  const handleClockOut = () => {
    if (!todayAttendance?.check_in_time) {
      toast({
        title: "Belum Clock In",
        description: "Anda harus clock in terlebih dahulu",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    if (todayAttendance?.check_out_time) {
      toast({
        title: "Sudah Clock Out",
        description: "Anda sudah melakukan clock out hari ini",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Check if it's too early to clock out (minimum work hours check)
    if (workSchedule && todayAttendance?.check_in_time) {
      const checkInTime = new Date(todayAttendance.check_in_time);
      const now = new Date();
      const workedHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // Minimum 4 hours work before allowing clock out
      if (workedHours < 4) {
        toast({
          title: "Belum Cukup Waktu Kerja",
          description: `Anda baru bekerja ${Math.floor(workedHours)} jam ${Math.floor(
            (workedHours % 1) * 60,
          )} menit. Minimal 4 jam kerja.`,
          variant: "destructive",
          duration: 4000,
        });
        return;
      }
    }
    setCameraModal({
      isOpen: true,
      type: 'clockout'
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => getCurrentPosition();

  const handleLateClockIn = async (reason: string) => {
    setLateModal({
      isOpen: false,
      lateMinutes: 0,
      scheduledTime: '',
      pendingClockIn: false
    });
    setCameraModal({
      isOpen: true,
      type: 'clockin'
    });

    // Store the late reason to be used when capturing the photo
    sessionStorage.setItem('lateReason', reason);
  };

  const handleCameraCapture = async (imageData: string) => {
    try {
      // Get current location
      const currentLocation = await getCurrentLocation();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "User tidak ditemukan",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Get user's active organization from profile
      const { data: profile }: any = await (supabase as any)
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.active_organization_id) {
        toast({
          title: "Error",
          description: "Organisasi aktif tidak ditemukan",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Get employee data for the active organization
      const { data: employee, error: employeeError }: any = await (supabase as any)
        .from('employees')
        .select('id, organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', profile.active_organization_id)
        .limit(1)
        .single();
        
      if (employeeError || !employee) {
        toast({
          title: "Error",
          description: "Data karyawan tidak ditemukan",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Get office location and validate distance
      const { data: offices, error: officeError }: any = await (supabase as any)
        .from('office_locations')
        .select('*')
        .eq('organization_id', employee.organization_id)
        .eq('is_active', true);
      if (officeError) {
        toast({
          title: "Error",
          description: "Gagal mengambil data kantor",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Calculate distance to each office and find the closest valid one
      let validOffice = null;
      let minDistance = Infinity;
      for (const office of offices || []) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          office.latitude,
          office.longitude
        );

        // Check if within radius and closer than previous offices
        if (distance <= office.radius_meters && distance < minDistance) {
          validOffice = office;
          minDistance = distance;
        }
      }

      if (!validOffice) {
        toast({
          title: "Lokasi Tidak Valid",
          description: "Anda tidak berada dalam radius area kantor yang diizinkan",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      if (cameraModal.type === 'clockin') {
        // Get late reason from session storage if exists
        const lateReason = sessionStorage.getItem('lateReason');

        // Pastikan work_schedule_id tersedia. Jika belum, ambil dari DB.
        let scheduleId: string | null = (workSchedule?.id as string) || null;
        if (!scheduleId) {
          // Try default first
          let { data: ws }: any = await (supabase as any)
            .from('work_schedule_settings')
            .select('id')
            .eq('organization_id', employee.organization_id)
            .eq('is_active', true)
            .eq('is_default', true)
            .maybeSingle();
          
          // If no default, get any active schedule
          if (!ws) {
            const { data: fallbackWs }: any = await (supabase as any)
              .from('work_schedule_settings')
              .select('id')
              .eq('organization_id', employee.organization_id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            ws = fallbackWs;
          }
          
          scheduleId = ws?.id || null;
        }
        
        if (!scheduleId) {
          toast({
            title: "Jadwal Kerja Tidak Ditemukan",
            description: "Silakan hubungi admin untuk mengatur jadwal kerja aktif.",
            variant: "destructive",
            duration: 4000,
          });
          return;
        }

        // Calculate lateness - using check-in time not current time
        const checkInTime = new Date();
        const checkInTimeMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        
        // Get schedule info for lateness calculation
        let scheduledStartTime = "08:00:00";
        let lateToleranceMinutes = 0;
        
        if (workSchedule) {
          scheduledStartTime = workSchedule.start_time || "08:00:00";
          lateToleranceMinutes = workSchedule.late_tolerance_minutes || 0;
        } else {
          // Fetch from DB if workSchedule not available
          const { data: scheduleData }: any = await (supabase as any)
            .from('work_schedule_settings')
            .select('start_time, late_tolerance_minutes')
            .eq('id', scheduleId)
            .single();
          if (scheduleData) {
            scheduledStartTime = scheduleData.start_time || "08:00:00";
            lateToleranceMinutes = scheduleData.late_tolerance_minutes || 0;
          }
        }
        
        const [startHour, startMinute] = scheduledStartTime.split(':').map(Number);
        const scheduledStartMinutes = startHour * 60 + startMinute;
        
        // Calculate actual late minutes
        const actualLateMinutes = Math.max(0, checkInTimeMinutes - scheduledStartMinutes);
        const isLate = actualLateMinutes > lateToleranceMinutes;
        
        console.log('Lateness calculation:', {
          checkInTimeMinutes,
          scheduledStartMinutes,
          lateToleranceMinutes,
          actualLateMinutes,
          isLate
        });

        // Clock In Logic - sanitize all values to prevent UUID null errors
        const attendanceData = {
          employee_id: employee.id,
          organization_id: employee.organization_id,
          attendance_date: new Date().toISOString().split('T')[0],
          check_in_time: new Date().toISOString(),
          check_in_location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            address: "Location captured"
          },
          office_location_id: validOffice.id,
          work_schedule_id: scheduleId || null, // Ensure no undefined values
          is_late: isLate,
          late_minutes: isLate ? actualLateMinutes : 0,
          check_in_photo_path: `attendance/${user.id}/${Date.now()}_checkin.jpg`,
          notes: lateReason || null
        };

        // Clean up session storage
        if (lateReason) {
          sessionStorage.removeItem('lateReason');
        }

        const { data: insertedRecord, error: insertError }: any = await (supabase as any)
          .from('attendance_records')
          .insert(attendanceData)
          .select()
          .single();

        if (insertError) {
          console.error('Clock in error:', insertError);
          toast({
            title: "Clock In Gagal",
            description: "Terjadi kesalahan saat menyimpan data",
            variant: "destructive",
            duration: 4000,
          });
          return;
        }

        // Create attendance validation record
        const validationData = {
          attendance_record_id: insertedRecord.id,
          organization_id: employee.organization_id,
          validation_type: 'overall',
          validation_status: 'valid',
          validation_details: {
            location_valid: true,
            schedule_valid: true,
            work_schedule_id: scheduleId
          },
          validated_at: new Date().toISOString()
        };

        const { error: validationError }: any = await (supabase as any)
          .from('attendance_validations')
          .insert(validationData);

        if (validationError) {
          console.error('Validation error:', validationError);
          // Continue even if validation fails, as attendance is already recorded
        }

        toast({
          title: "Clock In Berhasil",
          description: "Selamat! Anda telah berhasil melakukan clock in",
          variant: "default",
          duration: 3000,
        });

        // Trigger confetti celebration
        setTimeout(() => {
          triggerConfetti();
        }, 500);

      } else if (cameraModal.type === 'clockout') {
        // Clock Out Logic
        const { error: updateError }: any = await (supabase as any)
          .from('attendance_records')
          .update({
            check_out_time: new Date().toISOString(),
            check_out_location: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              address: "Location captured"
            },
            check_out_photo_path: `attendance/${user.id}/${Date.now()}_checkout.jpg`,
            working_hours_minutes: todayAttendance ? Math.floor((new Date().getTime() - new Date(todayAttendance.check_in_time!).getTime()) / (1000 * 60)) : 0
          })
          .eq('employee_id', employee.id)
          .eq('attendance_date', new Date().toISOString().split('T')[0])
          .is('check_out_time', null);

        if (updateError) {
          console.error('Clock out error:', updateError);
        toast({
          title: "Clock Out Gagal",
          description: "Terjadi kesalahan saat menyimpan data",
          variant: "destructive",
          duration: 4000,
        });
          return;
        }

        toast({
          title: "Clock Out Berhasil",
          description: "Selamat! Anda telah menyelesaikan hari kerja",
          variant: "default",
          duration: 3000,
        });

        // Trigger confetti celebration
        setTimeout(() => {
          triggerConfetti();
        }, 500);
      }

      // Refresh attendance data
      refetch();
    } catch (error) {
      console.error('Attendance error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleCameraClose = () => {
    setCameraModal({
      isOpen: false,
      type: null
    });
  };

  const currentOfficeLocation = officeLocation;
  const currentSchedule = todaySchedule;

  // Skeleton Loading Component
  const AbsensiSkeleton = () => (
    <div className="space-y-2">
      {/* Time Display Skeleton */}
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        <Skeleton className="h-12 w-48 mx-auto mb-2" />
        <Skeleton className="h-6 w-32 mx-auto" />
      </div>

      {/* Schedule Skeleton */}
      <div className="px-2">
        <div className="bg-card border border-border rounded-lg p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      {/* Location Skeleton */}
      <div className="px-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Attendance Status Skeleton */}
      <div className="px-3">
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="px-2">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      </div>
    </div>
  );

  const { height: viewportHeight, offsetTop: viewportOffsetTop } = useVisualViewport();

  return (
    <DesktopWarning>
      <LiveChatAppBadgeSync />
      <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        {/* Same structure as LiveChatListView: fixed viewport container, header (safe-area-top), scrollable content, footer (safe-area-bottom-lower) */}
        <main
          className="flex flex-col bg-background fixed inset-x-0 z-0"
          style={{
            top: viewportOffsetTop,
            height: viewportHeight > 0 ? viewportHeight : undefined,
            minHeight: viewportHeight > 0 ? undefined : '100dvh',
          }}
        >
          <header className="flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-3 bg-card border-b border-border safe-area-top">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <RealtimeStatusIndicator
                isConnected={realtimeConnected}
                onlineUsers={totalOnline}
                className="text-xs"
              />
            </div>
            <div className="hidden md:block">
              <RealtimeStatusIndicator
                isConnected={realtimeConnected}
                onlineUsers={totalOnline}
              />
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden seamless-scroll min-h-0">
              {showSkeleton ? (
                <div className="p-2">
                  <AbsensiSkeleton />
                </div>
              ) : (
                <>
                  <TimeDisplay />

                  {/* Location Button - di antara jam atas dan jam check in/out */}
                  {currentOfficeLocation && <LocationButton officeLocation={currentOfficeLocation} />}

                  <AttendanceStatus
                    checkIn={todayAttendance?.check_in_time ? new Date(todayAttendance.check_in_time).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : undefined}
                    checkOut={todayAttendance?.check_out_time ? new Date(todayAttendance.check_out_time).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : undefined}
                    workingHours={calculateWorkingHours()}
                  />

                  <AttendanceActions onClockIn={handleClockIn} onClockOut={handleClockOut} />

                  {currentSchedule && workSchedule && (
                    <div className="px-2 mb-2">
                      <TodaySchedule schedule={currentSchedule} />
                    </div>
                  )}

                  {currentOfficeLocation && <LocationChecker officeLocation={currentOfficeLocation} />}
                </>
              )}
            </div>
          </div>

          {/* Spacer so content doesn't scroll under the fixed footer; same as LiveChatListView */}
          <div className="flex-shrink-0" style={{ height: '80px' }} aria-hidden />
          <NavigationFooter className="safe-area-bottom-lower" />
        </main>

        <CameraModal
          isOpen={cameraModal.isOpen}
          onClose={handleCameraClose}
          onCapture={handleCameraCapture}
          title={cameraModal.type === 'clockin' ? 'Foto Clock In' : 'Foto Clock Out'}
        />

        <LateAttendanceModal
          isOpen={lateModal.isOpen}
          onClose={() => setLateModal({
            isOpen: false,
            lateMinutes: 0,
            scheduledTime: '',
            pendingClockIn: false
          })}
          onSubmit={handleLateClockIn}
          lateMinutes={lateModal.lateMinutes}
          scheduledTime={lateModal.scheduledTime}
        />
      </div>
    </SidebarProvider>
    </DesktopWarning>
  );
};

export default Absensi;
