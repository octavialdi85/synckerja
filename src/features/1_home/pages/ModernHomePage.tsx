import { useState } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { SectionMotifation } from '../components/SectionMotifation';
import { SectionProfile } from '../components/SectionProfile';
import { HomeOKRDashboard } from '../components/HomeOKRDashboard/HomeOKRDashboard';
import { SectionActivityNotifikasi } from '../components/SectionActivityNotifikasi';
import { SectionStatusKaryawan } from '../components/SectionStatusKaryawan';
// TODO: Update to use specific contribution modals
// import { ModalCreateObjective } from '../components/ModalCreateObjective';
import { ModalMotifationForm } from '../components/ModalMotifationForm/ModalMotifationForm';
import { ModalStatusKaryawan } from '../components/ModalStatusKaryawan';
import { Card, CardContent } from '@/features/ui/card';
import { TrendingUp, Users, Target } from 'lucide-react';

function ModernHomePage() {
  const [showCreateObjectiveModal, setShowCreateObjectiveModal] = useState(false);
  const [showMotivationModal, setShowMotivationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [motivationReloadTrigger, setMotivationReloadTrigger] = useState(0);
  const [statusCreatedTrigger, setStatusCreatedTrigger] = useState(0);

  const handleCreateObjective = () => {
    setShowCreateObjectiveModal(true);
  };

  const handleCloseCreateObjective = () => {
    setShowCreateObjectiveModal(false);
  };

  const handleCreateMotivation = () => {
    setShowMotivationModal(true);
  };

  const handleCloseMotivationModal = () => {
    setShowMotivationModal(false);
  };

  const handleCreateStatus = () => {
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
  };

  const handleMotivationCreated = () => {
    setMotivationReloadTrigger(prev => prev + 1);
    console.log('Motivation created, reloading data...');
  };

  const handleObjectiveCreated = () => {
    console.log('Objective created, reloading data...');
  };

  const handleStatusCreated = () => {
    setStatusCreatedTrigger(prev => prev + 1);
    console.log('Status created, reloading data...');
  };

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
                {/* Carousel Banner - Motivational Quote + Training Notifications */}
                <div className="flex-shrink-0 mt-2 mb-2">
                  <SectionMotifation />
                </div>

                {/* Main 3-Column Layout */}
                <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                  {/* Left Section - Profile & Quick Access (25%) */}
                  <div className="col-span-3 h-full">
                    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
                      <SectionProfile />
                    </div>
                  </div>

                  {/* Center Section - OKR Dashboard (50%) */}
                  <div className="col-span-6 h-full">
                    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
                      <HomeOKRDashboard />
                    </div>
                  </div>

                  {/* Right Section - Activities & Notifications (25%) */}
                  <div className="col-span-3 h-full">
                    <div className="h-full flex flex-col max-h-[calc(100vh-200px)]">
                      <SectionActivityNotifikasi />
                    </div>
                  </div>
                </div>

                {/* Status Karyawan - Moved to Bottom */}
                <div className="flex-shrink-0 mt-2">
                  <SectionStatusKaryawan 
                    statusCreatedTrigger={statusCreatedTrigger}
                  />
                </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* TODO: Update to use specific contribution modals */}
      {/* <ModalCreateObjective 
        open={showCreateObjectiveModal}
        onOpenChange={setShowCreateObjectiveModal}
        onSuccess={handleObjectiveCreated}
      /> */}

      <ModalMotifationForm 
        isOpen={showMotivationModal}
        onClose={handleCloseMotivationModal}
      />

      <ModalStatusKaryawan 
        isOpen={showStatusModal}
        onClose={handleCloseStatusModal}
        onStatusCreated={handleStatusCreated}
      />
    </StandardLayout>
  );
}

export default ModernHomePage;