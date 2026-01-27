
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';
import KOLDashboardStats from './KOLDashboardStats';
import KOLTable from './KOLTable';
import AddKOLModal from './AddKOLModal';

const KOLManagementContent = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KOL Management</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">
            <Users className="w-4 h-4" />
            KOL List
          </Button>
          <Button 
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add KOL
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <KOLDashboardStats />

      {/* KOL Table */}
      <KOLTable />

      {/* Add KOL Modal */}
      <AddKOLModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
      />
    </div>
  );
};

export default KOLManagementContent;
