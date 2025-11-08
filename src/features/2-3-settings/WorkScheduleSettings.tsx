
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Switch } from '@/features/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Badge } from '@/features/ui/badge';
import { Calendar, Clock, Plus, Settings, Trash2, Users, AlertCircle } from 'lucide-react';
import { useWorkScheduleSettings, WorkScheduleSettings as WorkScheduleSettingsType } from '@/features/2-1-employees/MyInfo/Attendance/hooks/useWorkScheduleSettings';
import { useAttendanceHolidays } from '@/features/2-3-settings/hooks/useLocationManagement';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { useEffect } from 'react';
import { ManualHolidayForm } from './ManualHolidayForm';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
];

const SCHEDULE_PRESETS = [
  { name: 'Senin - Jumat', working_days: [1, 2, 3, 4, 5] },
  { name: 'Senin - Sabtu', working_days: [1, 2, 3, 4, 5, 6] },
  { name: 'Setiap Hari', working_days: [1, 2, 3, 4, 5, 6, 7] },
];

export const WorkScheduleSettings = () => {
  const { settings, loading, createSettings, updateSettings, deleteSettings } = useWorkScheduleSettings();
  const { holidays, toggleHolidayStatus, workingDaysSummary, fetchWorkingDaysSummary, deleteHoliday } = useAttendanceHolidays();
  const { organizationId } = useCurrentOrg();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkScheduleSettingsType | null>(null);
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    working_days: [1, 2, 3, 4, 5],
    start_time: '08:00',
    end_time: '17:00',
    break_start_time: '12:00',
    break_end_time: '13:00',
    late_tolerance_minutes: 15,
    overtime_threshold_minutes: 0,
    is_default: false,
    timezone: 'Asia/Jakarta',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSchedule) {
      const result = await updateSettings(editingSchedule.id, formData);
      if (result) {
        setEditingSchedule(null);
        resetForm();
        // Refresh working days summary when schedule is updated
        if (organizationId) {
          fetchWorkingDaysSummary();
        }
      }
    } else {
      const result = await createSettings({
        ...formData,
        organization_id: organizationId!,
        is_active: true,
      });
      if (result) {
        setShowCreateForm(false);
        resetForm();
        // Refresh working days summary when new schedule is created
        if (organizationId) {
          fetchWorkingDaysSummary();
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      working_days: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '17:00',
      break_start_time: '12:00',
      break_end_time: '13:00',
      late_tolerance_minutes: 15,
      overtime_threshold_minutes: 0,
      is_default: false,
      timezone: 'Asia/Jakarta',
    });
  };

  const handleEdit = (schedule: WorkScheduleSettingsType) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      working_days: schedule.working_days,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start_time: schedule.break_start_time || '12:00',
      break_end_time: schedule.break_end_time || '13:00',
      late_tolerance_minutes: schedule.late_tolerance_minutes,
      overtime_threshold_minutes: schedule.overtime_threshold_minutes,
      is_default: schedule.is_default,
      timezone: schedule.timezone,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    const result = await deleteSettings(scheduleId);
    if (result && organizationId) {
      // Refresh working days summary when schedule is deleted
      fetchWorkingDaysSummary();
    }
  };

  // Load working days summary on component mount
  useEffect(() => {
    if (organizationId) {
      fetchWorkingDaysSummary();
    }
  }, [organizationId, fetchWorkingDaysSummary]);

  const formatWorkingDays = (days: number[]) => {
    return days.map(day => DAYS_OF_WEEK.find(d => d.value === day)?.label).join(', ');
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Pengaturan Jadwal Kerja</h2>
          <p className="text-gray-600 mt-1">Kelola hari kerja, jam kerja, dan hari libur nasional</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Jadwal
        </Button>
      </div>

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedules">
            <Clock className="h-4 w-4 mr-2" />
            Jadwal Kerja
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <Calendar className="h-4 w-4 mr-2" />
            Hari Libur Nasional
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {editingSchedule ? 'Edit Jadwal Kerja' : 'Tambah Jadwal Kerja Baru'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="name">Nama Jadwal</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="contoh: Jadwal Reguler"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Hari Kerja</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2 mb-3">
                          {SCHEDULE_PRESETS.map((preset) => (
                            <Badge
                              key={preset.name}
                              variant="outline"
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => setFormData(prev => ({ ...prev, working_days: preset.working_days }))}
                            >
                              {preset.name}
                            </Badge>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                              <Switch
                                checked={formData.working_days.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      working_days: [...prev.working_days, day.value].sort() 
                                    }));
                                  } else {
                                    setFormData(prev => ({ 
                                      ...prev, 
                                      working_days: prev.working_days.filter(d => d !== day.value) 
                                    }));
                                  }
                                }}
                              />
                              <Label className="text-sm">{day.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="start_time">Jam Masuk</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="end_time">Jam Pulang</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="break_start_time">Jam Istirahat Mulai</Label>
                      <Input
                        id="break_start_time"
                        type="time"
                        value={formData.break_start_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, break_start_time: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="break_end_time">Jam Istirahat Selesai</Label>
                      <Input
                        id="break_end_time"
                        type="time"
                        value={formData.break_end_time}
                        onChange={(e) => setFormData(prev => ({ ...prev, break_end_time: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="late_tolerance">Toleransi Terlambat (menit)</Label>
                      <Input
                        id="late_tolerance"
                        type="number"
                        min="0"
                        max="60"
                        value={formData.late_tolerance_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, late_tolerance_minutes: parseInt(e.target.value) || 0 }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="timezone">Zona Waktu</Label>
                      <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                          <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                          <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 flex items-center space-x-2">
                      <Switch
                        checked={formData.is_default}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                      />
                      <Label>Jadikan sebagai jadwal default</Label>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setEditingSchedule(null);
                        resetForm();
                      }}
                    >
                      Batal
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingSchedule ? 'Update Jadwal' : 'Simpan Jadwal'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {settings.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Belum ada jadwal kerja yang dikonfigurasi. Tambahkan jadwal kerja pertama untuk mengatur hari dan jam kerja karyawan.
                </AlertDescription>
              </Alert>
            ) : (
              settings.map((schedule) => (
                <Card key={schedule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{schedule.name}</h3>
                          {schedule.is_default && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>Hari Kerja:</strong> {formatWorkingDays(schedule.working_days)}</p>
                          <p><strong>Jam Kerja:</strong> {schedule.start_time} - {schedule.end_time}</p>
                          <p><strong>Jam Istirahat:</strong> {schedule.break_start_time} - {schedule.break_end_time}</p>
                          <p><strong>Toleransi Terlambat:</strong> {schedule.late_tolerance_minutes} menit</p>
                          <p><strong>Zona Waktu:</strong> {schedule.timezone}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <div className="flex items-center justify-between">
            <Alert className="flex-1 mr-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hari libur nasional yang diaktifkan akan mempengaruhi sistem absensi. Karyawan tidak akan diwajibkan absen pada hari-hari ini.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => setShowHolidayForm(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Hari Libur
            </Button>
          </div>

          {/* Working Days Summary */}
          {workingDaysSummary && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Hari Kerja Bulan Ini</h3>
                    <p className="text-sm text-blue-700">
                      Total: {workingDaysSummary.summary.working_days} hari kerja • 
                      {workingDaysSummary.summary.holiday_days} hari libur • 
                      {workingDaysSummary.summary.weekend_days} hari weekend
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Dihitung otomatis: {new Date(workingDaysSummary.calculated_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Holiday Form */}
          {showHolidayForm && (
            <ManualHolidayForm 
              onSuccess={() => {
                setShowHolidayForm(false);
                if (organizationId) {
                  fetchWorkingDaysSummary();
                }
              }}
              onCancel={() => setShowHolidayForm(false)}
            />
          )}

          {/* Organization Holidays Section */}
          {holidays.filter(h => h.organization_id).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Hari Libur Organisasi
              </h3>
              <div className="grid gap-4">
                {holidays.filter(h => h.organization_id).map((holiday) => (
                  <Card key={holiday.id} className={`border-l-4 border-l-blue-500 ${!holiday.is_active ? 'opacity-60 bg-gray-50' : 'bg-blue-50'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${!holiday.is_active ? 'text-gray-500' : 'text-blue-900'}`}>
                              {holiday.name}
                            </h3>
                            {!holiday.is_active && (
                              <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                                Tidak Aktif
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                              Organisasi
                            </Badge>
                          </div>
                          <p className={`text-sm ${!holiday.is_active ? 'text-gray-400' : 'text-blue-700'}`}>
                            {(() => {
                              try {
                                const date = new Date(holiday.date);
                                return isNaN(date.getTime()) ? holiday.date : date.toLocaleDateString('id-ID', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                              } catch {
                                return holiday.date;
                              }
                            })()}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Negara: {holiday.country_code}</span>
                            <span>• ID Org: {holiday.organization_id}</span>
                          </div>
                          {holiday.is_recurring && (
                            <Badge variant="outline" className="text-xs">
                              Berulang Tahunan ({holiday.recurring_type || 'annual'})
                            </Badge>
                          )}
                          {holiday.is_active && holiday.applies_to_attendance && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Berlaku untuk Absensi
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Apakah Anda yakin ingin menghapus hari libur ini?')) {
                                deleteHoliday(holiday.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Label className="text-sm">Aktifkan hari libur</Label>
                          <Switch
                            checked={holiday.is_active}
                            onCheckedChange={() => toggleHolidayStatus(holiday.id, holiday.is_active)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* National Holidays Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Hari Libur Nasional
            </h3>
            <div className="grid gap-4">
              {holidays.filter(h => !h.organization_id).map((holiday) => (
                <Card key={holiday.id} className={!holiday.is_active ? 'opacity-60 bg-gray-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${!holiday.is_active ? 'text-gray-500' : ''}`}>
                            {holiday.name}
                          </h3>
                          {!holiday.is_active && (
                            <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                              Tidak Aktif
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${!holiday.is_active ? 'text-gray-400' : 'text-gray-600'}`}>
                          {(() => {
                            try {
                              const date = new Date(holiday.date);
                              return isNaN(date.getTime()) ? holiday.date : date.toLocaleDateString('id-ID', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            } catch {
                              return holiday.date;
                            }
                          })()}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Negara: {holiday.country_code}</span>
                        </div>
                        {holiday.is_recurring && (
                          <Badge variant="outline" className="text-xs">
                            Berulang Tahunan ({holiday.recurring_type || 'annual'})
                          </Badge>
                        )}
                        {holiday.is_active && holiday.applies_to_attendance && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Berlaku untuk Absensi
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Aktifkan hari libur</Label>
                        <Switch
                          checked={holiday.is_active}
                          onCheckedChange={() => toggleHolidayStatus(holiday.id, holiday.is_active)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
