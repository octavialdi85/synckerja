import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Clock, Users, Settings } from 'lucide-react';
import { ShiftManagement } from './ShiftManagement';
import { EmployeeShiftAssignment } from './EmployeeShiftAssignment';

export const ShiftSettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pengaturan Shift Karyawan</h2>
          <p className="text-sm text-gray-600">Kelola shift kerja dan penugasan karyawan</p>
        </div>
      </div>

      <Tabs defaultValue="shifts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Master Shift
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Penugasan Karyawan
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manajemen Shift</CardTitle>
              <CardDescription>
                Buat dan kelola master data shift kerja untuk organisasi Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShiftManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Penugasan Shift Karyawan</CardTitle>
              <CardDescription>
                Tetapkan karyawan ke shift kerja yang sesuai
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeShiftAssignment />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
