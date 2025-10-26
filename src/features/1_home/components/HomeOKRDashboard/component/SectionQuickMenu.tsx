import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { SimpleAttendanceCamera } from './SectionQuickMenuImport/SimpleAttendanceCamera';
import { AttendanceStats } from './SectionQuickMenuImport/AttendanceStats';
import { useAttendanceStatus } from './AttendanceStatusProvider';
import { ModalPengajuanCutiKaryawan } from './SectionQuickMenuImport/ModalPengajuanCutiKaryawan';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { Clock, Camera, BarChart3, Users } from 'lucide-react';

interface TeamData {
  name: string;
  total: number;
  wfo: number;
  wfh: number;
}

interface SectionQuickMenuProps {
  isTeamLoading?: boolean;
  displayTeamData?: TeamData[];
}

export const SectionQuickMenu = ({ 
  isTeamLoading = false, 
  displayTeamData = [] 
}: SectionQuickMenuProps = {}) => {
  const { hasCheckedIn, hasCheckedOut, todayRecord, refreshStatus } = useAttendanceStatus();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { data: employeeData } = useCurrentEmployee();

  const calculateWorkingHours = (record: any) => {
    if (!record?.check_in_time) return "0 jam 0 menit";
    
    const checkIn = new Date(record.check_in_time);
    const checkOut = record.check_out_time ? new Date(record.check_out_time) : new Date();
    
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} jam ${minutes} menit`;
  };

  const workingHoursToday = todayRecord ? calculateWorkingHours(todayRecord) : "0 jam 0 menit";

  const handleRiwayatAbsensi = () => {
    if (employeeData?.id) {
      navigate(`/my-info/attendance?id=${employeeData.id}`);
    }
  };

  const handlePengajuanCuti = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleStatusCreated = () => {
    // Handle status creation if needed
    console.log('Status created successfully');
  };

  return (
    <Card className="border border-border h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 leading-snug">
          <Clock className="h-5 w-5 text-gray-500" />
          Quick Menu - Absensi Online
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-y-auto seamless-scroll scrollbar-hide">
        <SimpleAttendanceCamera 
          onAttendanceUpdate={refreshStatus} 
          onCameraStateChange={setIsCameraActive}
        />
        {!isCameraActive && <AttendanceStats workingHoursToday={workingHoursToday} />}
        
        {/* Tim Hari Ini Section */}
        <div className="bg-white border border-border rounded-lg p-3">
          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center leading-snug">
            <Users className="h-4 w-4 mr-2 text-gray-500" />
            Tim Hari Ini
          </h4>
          <div className="space-y-3">
            {isTeamLoading ? (
              <div className="text-center py-4">
                <div className="text-xs text-gray-500 leading-relaxed">Memuat data tim...</div>
              </div>
            ) : displayTeamData.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-xs text-gray-500 leading-relaxed">Belum ada data tim hari ini</div>
              </div>
            ) : (
              displayTeamData.map((team, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-900 leading-normal">{team.name}</span>
                    <span className="text-xs text-gray-500 leading-normal">{team.total} orang</span>
                  </div>
                  {team.total > 0 ? (
                    <>
                      <div className="flex space-x-1">
                        <div className="flex-1 bg-muted h-2 rounded overflow-hidden">
                          <div className="h-full bg-muted-foreground rounded" style={{
                            width: `${team.total > 0 ? (team.wfo / team.total * 100) : 0}%`
                          }} />
                        </div>
                        <div className="flex-1 bg-muted h-2 rounded overflow-hidden">
                          <div className="h-full bg-accent rounded" style={{
                            width: `${team.total > 0 ? (team.wfh / team.total * 100) : 0}%`
                          }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 leading-normal">
                        <span>WFO: {team.wfo}</span>
                        <span>WFH: {team.wfh}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 text-center py-2 leading-normal">
                      Belum ada data hari ini
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Additional Content */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-blue-900 mb-2 leading-snug">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleRiwayatAbsensi}
              className="flex items-center gap-2 p-2 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold leading-relaxed">Riwayat Absensi</span>
            </button>
            <button 
              onClick={handlePengajuanCuti}
              className="flex items-center gap-2 p-2 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold leading-relaxed">Pengajuan Cuti</span>
            </button>
          </div>
        </div>
      </CardContent>
      
      {/* Modal Pengajuan Cuti */}
      <ModalPengajuanCutiKaryawan
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleStatusCreated}
      />
    </Card>
  );
};
