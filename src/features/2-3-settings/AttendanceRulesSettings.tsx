import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Switch } from '@/features/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Badge } from '@/features/ui/badge';
import { Shield, Camera, Clock, AlertTriangle, Save } from 'lucide-react';
import { useWorkScheduleSettings } from '@/features/2-1-employees/MyInfo/Attendance/hooks/useWorkScheduleSettings';
import { Alert, AlertDescription } from '@/features/ui/alert';

export const AttendanceRulesSettings = () => {
  const { settings: schedules } = useWorkScheduleSettings();
  const [formData, setFormData] = useState({
    work_schedule_id: '',
    enforce_national_holidays: true,
    allow_weekend_attendance: false,
    require_photo_checkin: false,
    require_photo_checkout: false,
    auto_checkout_enabled: false,
    auto_checkout_time: '18:00',
    max_radius_meters: 100,
    gps_accuracy_threshold: 50,
    require_gps_accuracy: true,
    allow_manual_location: false,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Save to work schedule settings instead of location settings
      console.log('Saving attendance rules:', formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Aturan Absensi</h2>
          <p className="text-gray-600 mt-1">Konfigurasi aturan dan validasi untuk sistem absensi</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Schedule Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Jadwal Kerja Default
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="work_schedule">Pilih Jadwal Kerja</Label>
              <Select 
                value={formData.work_schedule_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, work_schedule_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jadwal kerja default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-schedule">Tanpa jadwal khusus</SelectItem>
                  {schedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {schedule.name} ({schedule.start_time} - {schedule.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Jadwal ini akan digunakan sebagai default untuk validasi absensi
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Holiday and Weekend Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Aturan Hari Libur & Weekend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Terapkan Hari Libur Nasional</Label>
                  <p className="text-sm text-gray-500">
                    Sistem akan mengecualikan hari libur nasional dari kewajiban absensi
                  </p>
                </div>
                <Switch
                  checked={formData.enforce_national_holidays}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enforce_national_holidays: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Izinkan Absensi Weekend</Label>
                  <p className="text-sm text-gray-500">
                    Karyawan dapat melakukan absensi pada hari Sabtu dan Minggu
                  </p>
                </div>
                <Switch
                  checked={formData.allow_weekend_attendance}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_weekend_attendance: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Persyaratan Foto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Wajib Foto saat Check-in</Label>
                  <p className="text-sm text-gray-500">
                    Karyawan harus mengambil foto selfie saat absensi masuk
                  </p>
                </div>
                <Switch
                  checked={formData.require_photo_checkin}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_photo_checkin: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Wajib Foto saat Check-out</Label>
                  <p className="text-sm text-gray-500">
                    Karyawan harus mengambil foto selfie saat absensi pulang
                  </p>
                </div>
                <Switch
                  checked={formData.require_photo_checkout}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_photo_checkout: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto Checkout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Auto Check-out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Aktifkan Auto Check-out</Label>
                <p className="text-sm text-gray-500">
                  Sistem otomatis akan melakukan check-out pada jam yang ditentukan
                </p>
              </div>
              <Switch
                checked={formData.auto_checkout_enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_checkout_enabled: checked }))}
              />
            </div>

            {formData.auto_checkout_enabled && (
              <div>
                <Label htmlFor="auto_checkout_time">Jam Auto Check-out</Label>
                <Input
                  id="auto_checkout_time"
                  type="time"
                  value={formData.auto_checkout_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, auto_checkout_time: e.target.value }))}
                  className="w-48"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Aturan Lokasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_radius">Radius Maksimal (meter)</Label>
                <Input
                  id="max_radius"
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.max_radius_meters}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_radius_meters: parseInt(e.target.value) || 100 }))}
                />
              </div>

              <div>
                <Label htmlFor="gps_accuracy">Threshold Akurasi GPS (meter)</Label>
                <Input
                  id="gps_accuracy"
                  type="number"
                  min="5"
                  max="100"
                  value={formData.gps_accuracy_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, gps_accuracy_threshold: parseInt(e.target.value) || 50 }))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Wajib Akurasi GPS</Label>
                  <p className="text-sm text-gray-500">
                    Tolak absensi jika akurasi GPS tidak memenuhi threshold
                  </p>
                </div>
                <Switch
                  checked={formData.require_gps_accuracy}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_gps_accuracy: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Izinkan Lokasi Manual</Label>
                  <p className="text-sm text-gray-500">
                    Karyawan dapat memasukkan koordinat lokasi secara manual
                  </p>
                </div>
                <Switch
                  checked={formData.allow_manual_location}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allow_manual_location: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Summary */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Status Konfigurasi Saat Ini:</strong></p>
              <div className="flex flex-wrap gap-2">
                {formData.enforce_national_holidays && <Badge variant="secondary">Hari Libur Nasional</Badge>}
                {formData.allow_weekend_attendance && <Badge variant="secondary">Weekend Allowed</Badge>}
                {formData.require_photo_checkin && <Badge variant="secondary">Foto Check-in</Badge>}
                {formData.require_photo_checkout && <Badge variant="secondary">Foto Check-out</Badge>}
                {formData.auto_checkout_enabled && <Badge variant="secondary">Auto Check-out</Badge>}
                {formData.require_gps_accuracy && <Badge variant="secondary">GPS Accuracy</Badge>}
                {formData.allow_manual_location && <Badge variant="secondary">Manual Location</Badge>}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};
