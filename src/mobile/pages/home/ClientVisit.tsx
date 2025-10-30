import { useState, useEffect, useMemo } from "react";
import { TimeDisplay } from "@/mobile/components/TimeDisplay";
import { LocationChecker, LocationButton } from "@/mobile/components/LocationChecker";
import { AttendanceStatus } from "@/mobile/components/AttendanceStatus";
import { ClientVisitActions } from "@/mobile/components/ClientVisitActions";
import { TodayVisitSchedule } from "@/mobile/components/TodayVisitSchedule";
import { VisitAnalyticsCard } from "@/mobile/components/VisitAnalyticsCard";
import { VisitNotifications } from "@/mobile/components/VisitNotifications";
import { NavigationFooter } from "@/mobile/components/NavigationFooter";
import { DesktopWarning } from "@/mobile/components/DesktopWarning";
import { AppSidebar } from "@/mobile/components/AppSidebar";
import { CameraModal } from "@/mobile/components/CameraModal";
import { LateAttendanceModal } from "@/mobile/components/LateAttendanceModal";
import { SalesActivityModal, SalesActivityData } from "@/mobile/components/SalesActivityModal";
import { CustomDatePicker } from "@/mobile/components/CustomDatePicker";
import { SidebarProvider, SidebarTrigger } from "@/mobile/components/ui/sidebar";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isWithinInterval, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mobile/components/ui/select";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { useToast } from "@/features/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useClientVisitData } from "@/mobile/hooks/useClientVisitData";
import { RealtimeStatusIndicator } from "@/mobile/components/RealtimeStatusIndicator";
import { useRealtimePresence } from "@/mobile/hooks/useRealtimePresence";
let confetti: any; try { confetti = require("canvas-confetti"); } catch {}

export default function ClientVisit() {
  const { toast } = useToast();
  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    type: 'start' | 'end' | null;
  }>({
    isOpen: false,
    type: null
  });
  
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [activeVisit, setActiveVisit] = useState<any>(null);
  const [locationValidation, setLocationValidation] = useState<any>(null);
  
  // Late attendance modal states
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [scheduledTime, setScheduledTime] = useState('');
  const [onLateSubmit, setOnLateSubmit] = useState<(reason: string) => Promise<void>>(() => async () => {});
  const [showSalesActivityModal, setShowSalesActivityModal] = useState(false);
  const [clientData, setClientData] = useState<{company_name: string; contact_phone?: string} | null>(null);
  const [dateFilter, setDateFilter] = useState("this_month");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{start: Date; end: Date} | null>(null);
  
  const {
    todayVisits,
    todaySchedule,
    loading,
    error,
    realtimeConnected,
    refetch
  } = useClientVisitData();

  // Setup user presence tracking
  const { onlineUsers, totalOnline } = useRealtimePresence(organizationId, currentUser || undefined);

  // Get current user info for presence tracking
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile }: any = await (supabase as any)
          .from('profiles')
          .select('full_name, active_organization_id')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setCurrentUser({ 
            id: user.id, 
            name: profile.full_name || user.email || 'Unknown'
          });
          setOrganizationId(profile.active_organization_id || '');
        }
      }
    };
    getCurrentUser();
  }, []);

  // Check for active visit
  useEffect(() => {
    const checkActiveVisit = () => {
      const active = todayVisits.find(visit => visit.status === 'in_progress');
      setActiveVisit(active || null);
    };
    checkActiveVisit();
  }, [todayVisits]);

  // Force refresh data when component mounts or when organization might change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  // Get date range based on filter selection
  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "today":
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday)
        };
      case "this_week":
        return {
          start: startOfWeek(now, {
            weekStartsOn: 1
          }),
          end: endOfWeek(now, {
            weekStartsOn: 1
          })
        };
      case "this_month":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case "custom":
        // Use custom date range if available, otherwise default to current month
        if (customDateRange) {
          return {
            start: startOfDay(customDateRange.start),
            end: endOfDay(customDateRange.end)
          };
        }
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }, [dateFilter, customDateRange]);

  // Handle date filter change
  const handleDateFilterChange = (value: string) => {
    if (value === "custom") {
      setShowCustomDatePicker(true);
    } else {
      setDateFilter(value);
    }
  };

  // Handle custom date range selection
  const handleCustomDateRange = (startDate: Date, endDate: Date) => {
    setCustomDateRange({ start: startDate, end: endDate });
    setDateFilter("custom");
  };

  // Filter visit data based on selected date range
  const filteredTodayVisits = useMemo(() => {
    if (!todayVisits || todayVisits.length === 0) return [];
    return todayVisits.filter(visit => {
      const visitDate = new Date(visit.visit_date);
      return isWithinInterval(visitDate, getDateRange);
    });
  }, [todayVisits, getDateRange]);

  const triggerConfetti = () => {
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

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  // Calculate visit duration real-time
  const calculateVisitDuration = () => {
    if (!activeVisit?.actual_start_time) {
      return "0 jam 0 menit";
    }
    const startTime = new Date(activeVisit.actual_start_time);
    const endTime = activeVisit.actual_end_time ? new Date(activeVisit.actual_end_time) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} jam ${minutes} menit`;
  };

  const handleStartVisit = () => {
    if (activeVisit) {
      toast({
        title: "Kunjungan Sedang Berlangsung",
        description: "Anda sudah memiliki kunjungan yang sedang berlangsung",
        variant: "destructive"
      });
      return;
    }

    setCameraModal({
      isOpen: true,
      type: 'start'
    });
  };

  const handleEndVisit = () => {
    if (!activeVisit) {
      toast({
        title: "Tidak Ada Kunjungan Aktif",
        description: "Anda harus memulai kunjungan terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    setCameraModal({
      isOpen: true,
      type: 'end'
    });
  };

  const getCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation tidak didukung browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, error => {
        reject(new Error("Gagal mendapatkan lokasi: " + error.message));
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });
  };

  const handleCameraCapture = async (imageData: string) => {
    try {
      // Get current location
      const currentLocation = await getCurrentLocation();

      // Get current user and organization for validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "User tidak ditemukan",
          variant: "destructive"
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
          variant: "destructive"
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
          variant: "destructive"
        });
        return;
      }

      // Perform location validation
      const { data: validationResult, error: validationError }: any = await (supabase as any).rpc(
        'validate_client_visit_location',
        {
          user_latitude: currentLocation.latitude,
          user_longitude: currentLocation.longitude,
          client_id_param: null,
          organization_id_param: profile.active_organization_id
        }
      );

      if (validationError) {
        console.error('Location validation error:', validationError);
        toast({
          title: "Error Validasi Lokasi",
          description: "Gagal memvalidasi lokasi",
          variant: "destructive"
        });
        return;
      }

      // Type the validation result
      const validation = validationResult as any;

      // Check if location is valid first
      if (!validation?.is_valid) {
        toast({
          title: "Lokasi Tidak Valid",
          description: `Anda harus berada dalam radius ${validation?.allowed_radius_meters || 100}m dari lokasi yang valid. Jarak saat ini: ${Math.round(validation?.distance_meters || 0)}m`,
          variant: "destructive"
        });
        return;
      }

      // Get the office location details to check is_client_location and sales assignment
      const { data: officeLocation, error: officeError }: any = await (supabase as any)
        .from('office_locations')
        .select('id, name, is_client_location, planned_start_time, planned_end_time, sales_person_id')
        .eq('id', validation.location_id)
        .maybeSingle();

      if (officeError) {
        console.error('Error fetching office location:', officeError);
        toast({
          title: "Error",
          description: "Gagal mendapatkan data lokasi kantor",
          variant: "destructive"
        });
        return;
      }

      // Check if this is a client location - ONLY allow visits for client locations
      if (!officeLocation?.is_client_location) {
        toast({
          title: "Akses Ditolak",
          description: "Lokasi ini tidak diizinkan untuk kunjungan client",
          variant: "destructive"
        });
        return;
      }

      // Check if current employee is assigned as sales person for this location
      if (officeLocation?.sales_person_id && officeLocation.sales_person_id !== employee.id) {
        toast({
          title: "Akses Ditolak",
          description: "Anda tidak ditugaskan untuk melakukan kunjungan ke lokasi ini",
          variant: "destructive"
        });
        return;
      }

      // Check if user is late based on current time and planned start time
      const currentTime = new Date();
      const currentTimeOnly = currentTime.toTimeString().slice(0, 8); // HH:MM:SS format
      let isLate = false;
      let lateMinutes = 0;

      if (officeLocation?.planned_start_time) {
        const plannedStartTime = officeLocation.planned_start_time;
        const plannedDate = new Date(`2000-01-01T${plannedStartTime}`);
        const currentDate = new Date(`2000-01-01T${currentTimeOnly}`);
        
        if (currentDate > plannedDate) {
          isLate = true;
          lateMinutes = Math.floor((currentDate.getTime() - plannedDate.getTime()) / (1000 * 60));
        }
      }

      if (cameraModal.type === 'start') {
        // Get the first available client for this organization
        let { data: clients }: any = await (supabase as any)
          .from('clients')
          .select('id')
          .eq('organization_id', employee.organization_id)
          .eq('is_active', true)
          .limit(1);

        // If no clients exist, create a default one
        if (!clients || clients.length === 0) {
          const { data: newClient, error: clientError }: any = await (supabase as any)
            .from('clients')
            .insert({
              organization_id: employee.organization_id,
              company_name: 'Client Default',
              contact_person: 'Default Contact',
              is_active: true
            })
            .select('id')
            .single();

          if (clientError) {
            toast({
              title: "Error",
              description: "Gagal membuat client default",
              variant: "destructive"
            });
            return;
          }

          clients = [newClient];
        }

        // Function to create visit record
        const createVisitRecord = async (lateReason?: string) => {
          // Start Visit Logic - Create a new client visit record
          const visitData = {
            employee_id: employee.id,
            organization_id: employee.organization_id,
            lead_client_id: clients[0].id,
            visit_date: new Date().toISOString().split('T')[0],
            planned_start_time: officeLocation?.planned_start_time || null,
            planned_end_time: officeLocation?.planned_end_time || null,
            visit_purpose: 'Spontaneous client visit',
            actual_start_time: new Date().toISOString(),
            start_location: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              address: "Location captured"
            },
            status: 'in_progress',
            start_photo_path: `visits/${user.id}/${Date.now()}_start.jpg`,
            created_by: user.id,
            validated_location_id: validation?.location_id || null,
            location_validation_result: validation || null,
            validation_accuracy_meters: validation?.accuracy_meters || null,
            notes: lateReason || null
          };

          const { data: insertedVisit, error: insertError }: any = await (supabase as any)
            .from('client_visits' as any)
            .insert(visitData)
            .select()
            .single();

          if (insertError) {
            console.error('Start visit error:', insertError);
            toast({
              title: "Gagal Memulai Kunjungan",
              description: "Terjadi kesalahan saat menyimpan data",
              variant: "destructive"
            });
            return;
          }

          toast({
            title: "🎉 Kunjungan Dimulai!",
            description: "Selamat! Kunjungan client telah dimulai",
            className: "bg-success text-success-foreground"
          });

          setTimeout(() => {
            triggerConfetti();
          }, 500);

          setActiveVisit(insertedVisit);
          await refetch();
        };

        // Check if user is late and show modal if needed
        if (isLate && lateMinutes > 0) {
          setLateMinutes(lateMinutes);
          setScheduledTime(officeLocation?.planned_start_time || '');
          setShowLateModal(true);
          setOnLateSubmit(() => createVisitRecord);
        } else {
          await createVisitRecord();
        }

      } else if (cameraModal.type === 'end') {
        // End Visit Logic
        const { error: updateError }: any = await (supabase as any)
          .from('client_visits' as any)
          .update({
            actual_end_time: new Date().toISOString(),
            end_location: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              address: "Location captured"
            },
            end_photo_path: `visits/${user.id}/${Date.now()}_end.jpg`,
            status: 'completed',
            // Update validation info for end visit if different from start
            ...(locationValidation && {
              location_validation_result: {
                ...activeVisit.location_validation_result,
                end_validation: locationValidation
              }
            })
          })
          .eq('id', activeVisit.id)
          .eq('status', 'in_progress');

        if (updateError) {
          console.error('End visit error:', updateError);
          toast({
            title: "Gagal Mengakhiri Kunjungan",
            description: "Terjadi kesalahan saat menyimpan data",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "🎉 Kunjungan Selesai!",
          description: "Selamat! Anda telah menyelesaikan kunjungan client",
          className: "bg-success text-success-foreground"
        });

        setTimeout(() => {
          triggerConfetti();
        }, 500);

        // Fetch client data for the modal
        if (activeVisit?.lead_client_id) {
          const { data: client }: any = await (supabase as any)
            .from('clients')
            .select('company_name, contact_phone, contact_person')
            .eq('id', activeVisit.lead_client_id)
            .single();
          
          if (client) {
            setClientData({
              company_name: client.company_name,
              contact_phone: client.contact_phone || client.contact_person // Use contact_person if contact_phone is empty
            });
          }
        }

        // Show sales activity modal
        setShowSalesActivityModal(true);
      }

      // Refresh visit data
      setCameraModal({ isOpen: false, type: null });
      refetch();
    } catch (error) {
      console.error('Visit error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga",
        variant: "destructive"
      });
    }
  };

  const handleCameraClose = () => {
    setCameraModal({
      isOpen: false,
      type: null
    });
  };

  const handleSalesActivitySubmit = async (data: SalesActivityData) => {
    try {
      // Get current user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      const { data: profile }: any = await (supabase as any)
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.active_organization_id) {
        throw new Error('Organization tidak ditemukan');
      }

      const salesActivityData = {
        organization_id: profile.active_organization_id,
        client_name: data.client_name,
        client_phone: data.client_phone,
        activity_type: data.activity_type,
        status: data.status,
        amount: data.amount,
        total_amount: data.total_amount,
        down_payment_amount: data.down_payment_amount,
        remaining_amount: data.total_amount && data.down_payment_amount 
          ? data.total_amount - data.down_payment_amount 
          : undefined,
        is_down_payment: data.is_down_payment,
        date: new Date().toISOString().split('T')[0], // Today's date
        description: data.description,
        is_paid: data.is_paid,
        payment_method: data.payment_method,
        receipt_url: data.receipt_url,
        follow_up_date: data.follow_up_date || null,
        notes: data.notes,
        created_by: user.id
      };

      const { error }: any = await (supabase as any)
        .from('sales_activities')
        .insert(salesActivityData);

      if (error) {
        console.error('Sales activity error:', error);
        toast({
          title: "Gagal Menyimpan",
          description: `Error: ${error.message}`,
          variant: "destructive"
        });
        throw error;
      }

      toast({
        title: "✅ Aktivitas Tersimpan!",
        description: "Aktivitas penjualan berhasil disimpan",
        className: "bg-success text-success-foreground"
      });

      // Close modal after successful save
      setShowSalesActivityModal(false);

    } catch (error) {
      console.error('Error saving sales activity:', error);
      throw error;
    }
  };

  // Calculate real analytics from filtered data
  const calculateAnalytics = useMemo(() => {
    const totalVisits = filteredTodayVisits.length;
    const completedVisits = filteredTodayVisits.filter(visit => visit.status === 'completed').length;
    const inProgressVisits = filteredTodayVisits.filter(visit => visit.status === 'in_progress').length;
    const upcomingVisits = filteredTodayVisits.filter(visit => visit.status === 'scheduled').length;
    
    // Calculate average duration for completed visits
    const completedVisitsWithDuration = filteredTodayVisits.filter(visit => 
      visit.status === 'completed' && visit.actual_start_time && visit.actual_end_time
    );
    
    let averageDuration = 0;
    if (completedVisitsWithDuration.length > 0) {
      const totalDuration = completedVisitsWithDuration.reduce((total, visit) => {
        const startTime = new Date(visit.actual_start_time);
        const endTime = new Date(visit.actual_end_time);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        return total + durationMinutes;
      }, 0);
      averageDuration = Math.floor(totalDuration / completedVisitsWithDuration.length);
    }

    return {
      totalVisits,
      completedVisits,
      averageDuration,
      upcomingVisits: upcomingVisits + inProgressVisits // Include in-progress as upcoming
    };
  }, [filteredTodayVisits]);

  // Get period label based on date filter
  const getPeriodLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Hari Ini";
      case "yesterday":
        return "Kemarin";
      case "this_week":
        return "Minggu Ini";
      case "this_month":
        return "Bulan Ini";
      case "last_month":
        return "Bulan Lalu";
      case "custom":
        if (customDateRange) {
          const startDate = format(customDateRange.start, "dd MMM");
          const endDate = format(customDateRange.end, "dd MMM yyyy");
          return `${startDate} - ${endDate}`;
        }
        return "Custom";
      default:
        return "Bulan Ini";
    }
  };

  const mockNotifications: any[] = [];

  // Skeleton Loading Component
  const ClientVisitSkeleton = () => (
    <div className="space-y-2">
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        <Skeleton className="h-12 w-48 mx-auto mb-2" />
        <Skeleton className="h-6 w-32 mx-auto" />
      </div>

      <div className="px-2">
        <div className="bg-card border border-border rounded-lg p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      <div className="px-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="px-2">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      </div>
    </div>
  );

  return (
    <DesktopWarning>
      <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <main className="flex-1 bg-background pb-20">
          <div className="flex items-center justify-between p-3 bg-card border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <RealtimeStatusIndicator 
                isConnected={realtimeConnected}
                className="text-xs md:hidden"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <RealtimeStatusIndicator 
                  isConnected={realtimeConnected}
                />
              </div>
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {loading ? (
            <div className="p-2">
              <ClientVisitSkeleton />
            </div>
          ) : (
            <>
              <TimeDisplay />

              <div className="px-3 py-2">
                <LocationButton />
              </div>
              
              <div className="px-3 mb-2">
                <AttendanceStatus 
                  checkIn={activeVisit?.actual_start_time ? new Date(activeVisit.actual_start_time).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }) : undefined} 
                  checkOut={activeVisit?.actual_end_time ? new Date(activeVisit.actual_end_time).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }) : undefined} 
                  workingHours={calculateVisitDuration()} 
                />
              </div>
              
              <div className="px-3 mb-2">
                <ClientVisitActions 
                  onStartVisit={handleStartVisit} 
                  onEndVisit={handleEndVisit}
                  hasActiveVisit={!!activeVisit}
                />
              </div>
              
              <div className="px-3 mb-2">
                <VisitNotifications />
              </div>
              
              {todaySchedule && (
                <div className="px-3 mb-2">
                  <TodayVisitSchedule visits={filteredTodayVisits} periodLabel={getPeriodLabel()} />
                </div>
              )}
              
              <div className="px-3 mb-2">
                <VisitAnalyticsCard {...calculateAnalytics} periodLabel={getPeriodLabel()} />
              </div>
            </>
          )}
          
          <NavigationFooter />
          
          <CameraModal 
            isOpen={cameraModal.isOpen} 
            onClose={handleCameraClose} 
            onCapture={handleCameraCapture} 
            title={cameraModal.type === 'start' ? 'Foto Mulai Kunjungan' : 'Foto Selesai Kunjungan'} 
          />

          <LateAttendanceModal
            isOpen={showLateModal}
            onClose={() => setShowLateModal(false)}
            onSubmit={onLateSubmit}
            lateMinutes={lateMinutes}
            scheduledTime={scheduledTime}
          />

          <SalesActivityModal
            isOpen={showSalesActivityModal}
            onClose={() => setShowSalesActivityModal(false)}
            onSubmit={handleSalesActivitySubmit}
            clientData={clientData}
          />

          <CustomDatePicker
            isOpen={showCustomDatePicker}
            onClose={() => setShowCustomDatePicker(false)}
            onDateRangeSelect={handleCustomDateRange}
            initialStartDate={customDateRange?.start}
            initialEndDate={customDateRange?.end}
          />
        </main>
      </div>
    </SidebarProvider>
    </DesktopWarning>
  );
}