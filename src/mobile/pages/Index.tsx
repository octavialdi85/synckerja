import { useState } from "react";
import { AttendanceHeader } from "@/components/AttendanceHeader";
import { TimeDisplay } from "@/components/TimeDisplay";
import { LocationChecker } from "@/components/LocationChecker";
import { AttendanceStatus } from "@/components/AttendanceStatus";
import { AttendanceActions } from "@/components/AttendanceActions";
import { TodaySchedule } from "@/components/TodaySchedule";
import { NavigationFooter } from "@/components/NavigationFooter";
import { AppSidebar } from "@/components/AppSidebar";
import { CameraModal } from "@/components/CameraModal";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useWorkSchedule } from "@/hooks/useWorkSchedule";

const Index = () => {
  const { toast } = useToast();
  const { workSchedule, loading: scheduleLoading } = useWorkSchedule();
  const [cameraModal, setCameraModal] = useState<{ isOpen: boolean; type: 'clockin' | 'clockout' | null }>({
    isOpen: false,
    type: null
  });

  // Data kantor - nanti akan diambil dari database
  const officeLocation = {
    name: "Kantor Pusat Jakarta",
    address: "Jl. Sudirman No. 123, Jakarta Pusat",
    latitude: -6.208763,
    longitude: 106.845599,
    radius: 50 // 50 meter radius
  };

  // Generate today's schedule from work schedule data
  const todaySchedule = workSchedule ? {
    startTime: workSchedule.start_time.slice(0, 5),
    endTime: workSchedule.end_time.slice(0, 5),
    location: "Kantor",
    department: "Department",
    notes: workSchedule.name
  } : {
    startTime: "08:00",
    endTime: "17:00", 
    location: "Kantor Pusat",
    department: "IT Department",
    notes: "Loading jadwal..."
  };

  const handleClockIn = () => {
    setCameraModal({ isOpen: true, type: 'clockin' });
  };

  const handleClockOut = () => {
    setCameraModal({ isOpen: true, type: 'clockout' });
  };

  const handleCameraCapture = (imageData: string) => {
    const action = cameraModal.type === 'clockin' ? 'Clock In' : 'Clock Out';
    toast({
      title: `${action} Berhasil`,
      description: `Anda telah berhasil melakukan ${action.toLowerCase()} dengan foto`,
      className: cameraModal.type === 'clockin' ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
    });
    // Here you would typically send the imageData to your backend
    console.log(`${action} photo:`, imageData);
  };

  const handleCameraClose = () => {
    setCameraModal({ isOpen: false, type: null });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <main className="flex-1 bg-background pb-20">
          <div className="flex items-center justify-between p-3 bg-card border-b border-border md:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Sistem Absensi</h1>
            <div></div>
          </div>
          
          <TimeDisplay />
          
          <div className="px-3 mb-2">
            {!scheduleLoading && workSchedule && (
              <TodaySchedule schedule={todaySchedule} />
            )}
          </div>
          
          <LocationChecker officeLocation={officeLocation} />
          
          <AttendanceStatus 
            checkIn="22:33:00"
            checkOut="22:33:09"
            workingHours="0 hr 0 min"
          />
          
          <AttendanceActions 
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />
          
          <NavigationFooter />
          
          <CameraModal
            isOpen={cameraModal.isOpen}
            onClose={handleCameraClose}
            onCapture={handleCameraCapture}
            title={cameraModal.type === 'clockin' ? 'Foto Clock In' : 'Foto Clock Out'}
          />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
