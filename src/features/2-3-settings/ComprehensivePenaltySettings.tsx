import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Switch } from '@/features/ui/switch';
import { Badge } from '@/features/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { Textarea } from '@/features/ui/textarea';
import { Calendar } from '@/features/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { 
  Settings, 
  DollarSign, 
  Users, 
  Shield, 
  AlertTriangle, 
  Plus,
  Pencil,
  Trash2,
  CalendarIcon,
  Clock,
  Bell,
  Target
} from 'lucide-react';
import { usePenaltySettings, usePenaltyRules } from '@/features/2-3-settings/hooks/useLocationManagement';
import { useEmployees } from '@/features/2-1-employees/hooks/useEmployees';
import { PenaltyRuleFormDialog } from './PenaltyRuleFormDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const ComprehensivePenaltySettings = () => {
  const { settings, loading, updateSettings, exemptions, createExemption, updateExemption, deleteExemption } = usePenaltySettings();
  const { rules = [], deleteRule } = usePenaltyRules();
  const { data: employees = [] } = useEmployees();
  const [activeTab, setActiveTab] = useState('general');
  const [isExemptionDialogOpen, setIsExemptionDialogOpen] = useState(false);
  const [editingExemption, setEditingExemption] = useState<any>(null);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    enable_automatic_penalties: settings?.enable_automatic_penalties ?? true,
    penalty_calculation_timezone: settings?.penalty_calculation_timezone ?? 'Asia/Jakarta',
    minimum_penalty_amount: settings?.minimum_penalty_amount ?? 0,
    maximum_daily_penalty: settings?.maximum_daily_penalty ?? 0,
    maximum_monthly_penalty: settings?.maximum_monthly_penalty ?? 0,
    penalty_deduction_date: settings?.penalty_deduction_date ?? 25,
    default_calculation_type: settings?.default_calculation_type ?? 'fixed',
    default_hourly_rate: settings?.default_hourly_rate ?? 50000,
    default_salary_percentage: settings?.default_salary_percentage ?? 5.0,
    enable_salary_based_calculation: settings?.enable_salary_based_calculation ?? true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    notify_employee: settings?.notification_settings?.notify_employee ?? true,
    notify_manager: settings?.notification_settings?.notify_manager ?? true,
    notify_hr: settings?.notification_settings?.notify_hr ?? true,
  });

  const [holidaySettings, setHolidaySettings] = useState({
    apply_on_holidays: settings?.holiday_penalty_rules?.apply_on_holidays ?? false,
    apply_on_weekends: settings?.holiday_penalty_rules?.apply_on_weekends ?? false,
  });

  const [graceSettings, setGraceSettings] = useState({
    first_offense_grace: settings?.grace_settings?.first_offense_grace ?? false,
    monthly_grace_limit: settings?.grace_settings?.monthly_grace_limit ?? 0,
  });

  const [exemptionForm, setExemptionForm] = useState({
    employee_id: '',
    penalty_rule_id: '',
    exemption_type: 'temporary',
    start_date: new Date(),
    end_date: undefined as Date | undefined,
    reason: '',
    conditions: '',
  });

  useEffect(() => {
    if (!settings) {
      setGeneralSettings({
        enable_automatic_penalties: true,
        penalty_calculation_timezone: 'Asia/Jakarta',
        minimum_penalty_amount: 0,
        maximum_daily_penalty: 0,
        maximum_monthly_penalty: 0,
        penalty_deduction_date: 25,
        default_calculation_type: 'fixed',
        default_hourly_rate: 50000,
        default_salary_percentage: 5,
        enable_salary_based_calculation: true,
      });
      setNotificationSettings({
        notify_employee: true,
        notify_manager: true,
        notify_hr: true,
      });
      setHolidaySettings({
        apply_on_holidays: false,
        apply_on_weekends: false,
      });
      setGraceSettings({
        first_offense_grace: false,
        monthly_grace_limit: 0,
      });
      return;
    }

    setGeneralSettings({
      enable_automatic_penalties: settings.enable_automatic_penalties ?? true,
      penalty_calculation_timezone: settings.penalty_calculation_timezone ?? 'Asia/Jakarta',
      minimum_penalty_amount: Number(settings.minimum_penalty_amount ?? 0),
      maximum_daily_penalty: Number(settings.maximum_daily_penalty ?? 0),
      maximum_monthly_penalty: Number(settings.maximum_monthly_penalty ?? 0),
      penalty_deduction_date: settings.penalty_deduction_date ?? 25,
      default_calculation_type: settings.default_calculation_type ?? 'fixed',
      default_hourly_rate: Number(settings.default_hourly_rate ?? 50000),
      default_salary_percentage: Number(settings.default_salary_percentage ?? 5),
      enable_salary_based_calculation: settings.enable_salary_based_calculation ?? true,
    });

    const notification = settings.notification_settings ?? {};
    setNotificationSettings({
      notify_employee: notification.notify_employee ?? true,
      notify_manager: notification.notify_manager ?? true,
      notify_hr: notification.notify_hr ?? true,
    });

    const holiday = settings.holiday_penalty_rules ?? {};
    setHolidaySettings({
      apply_on_holidays: holiday.apply_on_holidays ?? false,
      apply_on_weekends: holiday.apply_on_weekends ?? false,
    });

    const grace = settings.grace_settings ?? {};
    setGraceSettings({
      first_offense_grace: grace.first_offense_grace ?? false,
      monthly_grace_limit: grace.monthly_grace_limit ?? 0,
    });
  }, [settings]);

  const handleSaveGeneralSettings = async () => {
    try {
      await updateSettings({
        ...generalSettings,
        notification_settings: notificationSettings,
        holiday_penalty_rules: holidaySettings,
        grace_settings: graceSettings,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleCreateExemption = async () => {
    try {
      await createExemption({
        ...exemptionForm,
        start_date: exemptionForm.start_date.toISOString().split('T')[0],
        end_date: exemptionForm.end_date?.toISOString().split('T')[0],
        conditions: exemptionForm.conditions ? JSON.parse(exemptionForm.conditions) : null,
        is_active: true,
        created_by: '',
      });
      setIsExemptionDialogOpen(false);
      resetExemptionForm();
    } catch (error) {
      console.error('Error creating exemption:', error);
    }
  };

  const resetExemptionForm = () => {
    setExemptionForm({
      employee_id: '',
      penalty_rule_id: '',
      exemption_type: 'temporary',
      start_date: new Date(),
      end_date: undefined,
      reason: '',
      conditions: '',
    });
    setEditingExemption(null);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setIsRuleDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Yakin ingin menghapus aturan denda ini?')) {
      await deleteRule(ruleId);
    }
  };

  const handleRuleDialogClose = () => {
    setIsRuleDialogOpen(false);
    setEditingRule(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading penalty settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Pengaturan Denda Keterlambatan</h2>
          <p className="text-gray-600 mt-1">Kelola aturan dan pengaturan denda untuk pelanggaran absensi</p>
        </div>
        <Badge variant={generalSettings.enable_automatic_penalties ? "default" : "secondary"}>
          {generalSettings.enable_automatic_penalties ? 'Aktif' : 'Nonaktif'}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Aturan
          </TabsTrigger>
          <TabsTrigger value="exemptions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Pengecualian
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifikasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Info Section about Calculation Types */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Target className="h-5 w-5" />
                Jenis Perhitungan Denda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-white rounded-lg border">
                  <h4 className="font-semibold text-blue-900 mb-2">1. Denda Tetap</h4>
                  <p className="text-gray-600 mb-2">
                    Denda fix yang tidak berubah berdasarkan durasi keterlambatan.
                  </p>
                  <div className="text-xs text-gray-500">
                    Contoh: Telat 5 menit atau 60 menit, denda tetap Rp 500.000
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <h4 className="font-semibold text-green-900 mb-2">2. Per Jam</h4>
                  <p className="text-gray-600 mb-2">
                    Denda dihitung berdasarkan durasi keterlambatan × tarif per jam.
                  </p>
                  <div className="text-xs text-gray-500">
                    Contoh: Telat 2 jam × Rp 50.000/jam = Rp 100.000
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <h4 className="font-semibold text-purple-900 mb-2">3. Prorata Gaji</h4>
                  <p className="text-gray-600 mb-2">
                    Denda berdasarkan persentase dari gaji bulanan karyawan.
                  </p>
                  <div className="text-xs text-gray-500">
                    Contoh: 5% dari gaji Rp 10.000.000 = Rp 500.000
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Pengaturan Dasar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={generalSettings.enable_automatic_penalties}
                    onCheckedChange={(checked) => 
                      setGeneralSettings(prev => ({ ...prev, enable_automatic_penalties: checked }))
                    }
                  />
                  <Label>Aktifkan denda otomatis</Label>
                </div>

                <div>
                  <Label>Zona Waktu Perhitungan</Label>
                  <Select 
                    value={generalSettings.penalty_calculation_timezone}
                    onValueChange={(value) => 
                      setGeneralSettings(prev => ({ ...prev, penalty_calculation_timezone: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Jakarta">WIB (Asia/Jakarta)</SelectItem>
                      <SelectItem value="Asia/Makassar">WITA (Asia/Makassar)</SelectItem>
                      <SelectItem value="Asia/Jayapura">WIT (Asia/Jayapura)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tanggal Pemotongan Gaji</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={generalSettings.penalty_deduction_date}
                    onChange={(e) => 
                      setGeneralSettings(prev => ({ ...prev, penalty_deduction_date: parseInt(e.target.value) || 25 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tanggal dalam bulan ketika denda dipotong dari gaji
                  </p>
                </div>

                <div>
                  <Label>Jenis Perhitungan Denda Default</Label>
                  <Select 
                    value={generalSettings.default_calculation_type}
                    onValueChange={(value) => 
                      setGeneralSettings(prev => ({ ...prev, default_calculation_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Denda Tetap</SelectItem>
                      <SelectItem value="hourly">Per Jam</SelectItem>
                      <SelectItem value="salary_percentage">Persentase Gaji</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Jenis perhitungan denda yang digunakan secara default
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Batas Denda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Denda Minimum (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={generalSettings.minimum_penalty_amount}
                    onChange={(e) => 
                      setGeneralSettings(prev => ({ ...prev, minimum_penalty_amount: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>

                <div>
                  <Label>Batas Denda Harian (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={generalSettings.maximum_daily_penalty || ''}
                    onChange={(e) => 
                      setGeneralSettings(prev => ({ ...prev, maximum_daily_penalty: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="Tidak terbatas"
                  />
                </div>

                <div>
                  <Label>Batas Denda Bulanan (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={generalSettings.maximum_monthly_penalty || ''}
                    onChange={(e) => 
                      setGeneralSettings(prev => ({ ...prev, maximum_monthly_penalty: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="Tidak terbatas"
                  />
                </div>

                <div>
                  <Label>Tarif Denda Per Jam Default (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={generalSettings.default_hourly_rate}
                    onChange={(e) => 
                      setGeneralSettings(prev => ({ ...prev, default_hourly_rate: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Digunakan untuk perhitungan denda per jam
                  </p>
                </div>

                <div>
                  <Label>Persentase Gaji Default (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={generalSettings.default_salary_percentage}
                    onChange={(e) => 
                      setGeneralSettings(prev => ({ ...prev, default_salary_percentage: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Digunakan untuk perhitungan denda berdasarkan persentase gaji
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Aturan Hari Libur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={holidaySettings.apply_on_holidays}
                    onCheckedChange={(checked) => 
                      setHolidaySettings(prev => ({ ...prev, apply_on_holidays: checked }))
                    }
                  />
                  <Label>Terapkan denda pada hari libur nasional</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={holidaySettings.apply_on_weekends}
                    onCheckedChange={(checked) => 
                      setHolidaySettings(prev => ({ ...prev, apply_on_weekends: checked }))
                    }
                  />
                  <Label>Terapkan denda pada akhir pekan</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Pengaturan Toleransi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={graceSettings.first_offense_grace}
                    onCheckedChange={(checked) => 
                      setGraceSettings(prev => ({ ...prev, first_offense_grace: checked }))
                    }
                  />
                  <Label>Berikan toleransi untuk pelanggaran pertama</Label>
                </div>

                <div>
                  <Label>Batas Toleransi Bulanan</Label>
                  <Input
                    type="number"
                    min="0"
                    value={graceSettings.monthly_grace_limit}
                    onChange={(e) => 
                      setGraceSettings(prev => ({ ...prev, monthly_grace_limit: parseInt(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Jumlah maksimal pelanggaran yang ditoleranse per bulan
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveGeneralSettings} className="min-w-[120px]">
              Simpan Pengaturan
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Aturan Denda</h3>
            <PenaltyRuleFormDialog />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Aturan Denda Aktif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {rules.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Belum ada aturan denda yang dikonfigurasi</h3>
                    <p className="text-sm mb-4">
                      Buat aturan denda untuk mengotomatiskan perhitungan denda keterlambatan
                    </p>
                    <PenaltyRuleFormDialog isCompact={false} />
                  </div>
                ) : (
                  rules.map((rule) => (
                    <Card key={rule.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge variant={rule.is_active ? "default" : "secondary"}>
                              {rule.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rule.calculation_type === 'fixed' && 'Denda Tetap'}
                              {rule.calculation_type === 'hourly' && 'Per Jam'}
                              {rule.calculation_type === 'salary_percentage' && 'Persentase Gaji'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditRule(rule)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium text-gray-900">Jenis Pelanggaran:</span>
                            <br />
                            <span className="capitalize">
                              {rule.rule_type.replace('_', ' ')}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Batas Waktu:</span>
                            <br />
                            {rule.threshold_minutes} menit
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Perhitungan:</span>
                            <br />
                            {rule.calculation_type === 'fixed' && `${formatCurrency(rule.penalty_amount)}`}
                            {rule.calculation_type === 'hourly' && `${formatCurrency(rule.hourly_rate || 0)}/jam`}
                            {rule.calculation_type === 'salary_percentage' && `${rule.salary_percentage}% gaji`}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">Batas Maksimal:</span>
                            <br />
                            {rule.max_penalty_per_month ? formatCurrency(rule.max_penalty_per_month) : 'Tidak terbatas'}
                          </div>
                        </div>
                        
                        {rule.description && (
                          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                            <span className="font-medium">Deskripsi: </span>
                            {rule.description}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exemptions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Pengecualian Denda</h3>
            <Dialog open={isExemptionDialogOpen} onOpenChange={setIsExemptionDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetExemptionForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pengecualian
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingExemption ? 'Edit Pengecualian' : 'Tambah Pengecualian'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Karyawan</Label>
                    <Select 
                      value={exemptionForm.employee_id}
                      onValueChange={(value) => setExemptionForm(prev => ({ ...prev, employee_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih karyawan" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Aturan Denda (Opsional)</Label>
                    <Select 
                      value={exemptionForm.penalty_rule_id}
                      onValueChange={(value) => setExemptionForm(prev => ({ ...prev, penalty_rule_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Semua aturan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua aturan</SelectItem>
                        {rules.map((rule) => (
                          <SelectItem key={rule.id} value={rule.id}>
                            {rule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Jenis Pengecualian</Label>
                    <Select 
                      value={exemptionForm.exemption_type}
                      onValueChange={(value) => setExemptionForm(prev => ({ ...prev, exemption_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temporary">Sementara</SelectItem>
                        <SelectItem value="permanent">Permanen</SelectItem>
                        <SelectItem value="conditional">Bersyarat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tanggal Mulai</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {exemptionForm.start_date ? format(exemptionForm.start_date, "PPP") : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={exemptionForm.start_date}
                          onSelect={(date) => date && setExemptionForm(prev => ({ ...prev, start_date: date }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {exemptionForm.exemption_type === 'temporary' && (
                    <div>
                      <Label>Tanggal Berakhir</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {exemptionForm.end_date ? format(exemptionForm.end_date, "PPP") : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={exemptionForm.end_date}
                            onSelect={(date) => setExemptionForm(prev => ({ ...prev, end_date: date }))}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div>
                    <Label>Alasan</Label>
                    <Textarea
                      value={exemptionForm.reason}
                      onChange={(e) => setExemptionForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Masukkan alasan pengecualian..."
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsExemptionDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleCreateExemption}>
                      {editingExemption ? 'Update' : 'Tambah'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {exemptions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Belum ada pengecualian</h3>
                  <p className="text-muted-foreground mb-4">
                    Buat pengecualian untuk karyawan yang tidak dikenakan denda tertentu.
                  </p>
                  <Button onClick={() => setIsExemptionDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Pengecualian Pertama
                  </Button>
                </CardContent>
              </Card>
            ) : (
              exemptions.map((exemption) => (
                <Card key={exemption.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">
                            {employees.find(e => e.id === exemption.employee_id)?.full_name || 'Unknown Employee'}
                          </h4>
                          <Badge variant={exemption.is_active ? "default" : "secondary"}>
                            {exemption.is_active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          <Badge variant="outline">
                            {exemption.exemption_type}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Mulai:</span> {format(new Date(exemption.start_date), "dd/MM/yyyy")}
                          </div>
                          {exemption.end_date && (
                            <div>
                              <span className="font-medium">Berakhir:</span> {format(new Date(exemption.end_date), "dd/MM/yyyy")}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Alasan:</span> {exemption.reason}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingExemption(exemption);
                          setIsExemptionDialogOpen(true);
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (confirm('Yakin ingin menghapus pengecualian ini?')) {
                            deleteExemption(exemption.id);
                          }
                        }}>
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

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Pengaturan Notifikasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={notificationSettings.notify_employee}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, notify_employee: checked }))
                  }
                />
                <Label>Notifikasi ke karyawan saat denda diterapkan</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={notificationSettings.notify_manager}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, notify_manager: checked }))
                  }
                />
                <Label>Notifikasi ke manajer langsung</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={notificationSettings.notify_hr}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({ ...prev, notify_hr: checked }))
                  }
                />
                <Label>Notifikasi ke tim HR</Label>
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveGeneralSettings}>
                  Simpan Pengaturan Notifikasi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Rule Dialog */}
      {isRuleDialogOpen && (
        <PenaltyRuleFormDialog 
          editingRule={editingRule}
          onClose={handleRuleDialogClose}
        />
      )}
    </div>
  );
};
