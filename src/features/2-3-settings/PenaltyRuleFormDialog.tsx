import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Switch } from '@/features/ui/switch';
import { Textarea } from '@/features/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { Badge } from '@/features/ui/badge';
import { Plus, Calculator, Clock, Percent, Info, Target, DollarSign } from 'lucide-react';
import { usePenaltyRules, PenaltyRule } from '@/features/2-3-settings/hooks/useLocationManagement';

type RuleType = 'late_arrival' | 'early_departure' | 'no_checkout' | 'invalid_location';
type PenaltyType = 'deduction' | 'warning' | 'points';
type CalculationType = 'fixed' | 'hourly' | 'salary_percentage';

interface FormData {
  name: string;
  rule_type: RuleType;
  threshold_minutes: number;
  penalty_amount: number | null;
  penalty_type: PenaltyType;
  calculation_type: CalculationType;
  hourly_rate?: number | null;
  salary_percentage?: number | null;
  max_penalty_per_month?: number;
  description?: string;
  is_active: boolean;
  applies_to_all: boolean;
}

interface PenaltyRuleFormDialogProps {
  isCompact?: boolean;
  editingRule?: PenaltyRule | null;
  onClose?: () => void;
}

export const PenaltyRuleFormDialog = ({ 
  isCompact = true, 
  editingRule = null,
  onClose 
}: PenaltyRuleFormDialogProps) => {
  const { createRule, updateRule, isPenaltyMigrationComplete } = usePenaltyRules();
  const [isOpen, setIsOpen] = useState(!!editingRule);
  const [formData, setFormData] = useState<FormData>({
    name: editingRule?.name || '',
    rule_type: editingRule?.rule_type || 'late_arrival',
    threshold_minutes: editingRule?.threshold_minutes || 15,
    penalty_amount: editingRule?.penalty_amount || 50000,
    penalty_type: editingRule?.penalty_type || 'deduction',
    calculation_type: editingRule?.calculation_type || 'fixed',
    hourly_rate: editingRule?.hourly_rate || 50000,
    salary_percentage: editingRule?.salary_percentage || 5.0,
    max_penalty_per_month: editingRule?.max_penalty_per_month,
    description: editingRule?.description || '',
    is_active: editingRule?.is_active ?? true,
    applies_to_all: editingRule?.applies_to_all ?? true,
  });

  // Effect to sync dialog state with editingRule prop
  useEffect(() => {
    if (editingRule) {
      setIsOpen(true);
      setFormData({
        name: editingRule.name || '',
        rule_type: editingRule.rule_type || 'late_arrival',
        threshold_minutes: editingRule.threshold_minutes || 15,
        penalty_amount: editingRule.penalty_amount || 50000,
        penalty_type: editingRule.penalty_type || 'deduction',
        calculation_type: editingRule.calculation_type || 'fixed',
        hourly_rate: editingRule.hourly_rate || 50000,
        salary_percentage: editingRule.salary_percentage || 5.0,
        max_penalty_per_month: editingRule.max_penalty_per_month,
        description: editingRule.description || '',
        is_active: editingRule.is_active ?? true,
        applies_to_all: editingRule.applies_to_all ?? true,
      });
    }
  }, [editingRule]);

  const resetForm = () => {
    setFormData({
      name: '',
      rule_type: 'late_arrival',
      threshold_minutes: 15,
      penalty_amount: 50000,
      penalty_type: 'deduction',
      calculation_type: 'fixed',
      hourly_rate: 50000,
      salary_percentage: 5.0,
      max_penalty_per_month: undefined,
      description: '',
      is_active: true,
      applies_to_all: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Prepare form data with NULL values based on calculation type
      const processedFormData = {
        ...formData,
        // Set penalty_amount to NULL if not using fixed calculation
        penalty_amount: formData.calculation_type === 'fixed' ? formData.penalty_amount : null,
        // Set hourly_rate to NULL if not using hourly calculation
        hourly_rate: formData.calculation_type === 'hourly' ? formData.hourly_rate : null,
        // Set salary_percentage to NULL if not using salary percentage calculation
        salary_percentage: formData.calculation_type === 'salary_percentage' ? formData.salary_percentage : null,
      };

      if (editingRule) {
        await updateRule(editingRule.id, processedFormData);
      } else {
        await createRule(processedFormData);
      }
      setIsOpen(false);
      resetForm();
      onClose?.();
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
    onClose?.();
  };

  const getRuleTypeLabel = (type: RuleType) => {
    switch (type) {
      case 'late_arrival': return 'Terlambat Masuk';
      case 'early_departure': return 'Pulang Lebih Awal';
      case 'no_checkout': return 'Tidak Check-out';
      case 'invalid_location': return 'Lokasi Tidak Valid';
      default: return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateExample = () => {
    const baseAmount = formData.penalty_amount;
    switch (formData.calculation_type) {
      case 'fixed':
        return `Contoh: Telat berapapun = ${formatCurrency(baseAmount)}`;
      case 'hourly':
        const hours = 2.5;
        const hourlyAmount = (formData.hourly_rate || 0) * hours;
        return `Contoh: Telat ${hours} jam = ${formatCurrency(hourlyAmount)}`;
      case 'salary_percentage':
        const salary = 10000000;
        const percentageAmount = (salary * (formData.salary_percentage || 0)) / 100;
        return `Contoh: ${formData.salary_percentage}% dari gaji Rp 10jt = ${formatCurrency(percentageAmount)}`;
      default:
        return '';
    }
  };

  if (!isPenaltyMigrationComplete) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Sistem denda belum tersedia. Silakan jalankan migrasi database terlebih dahulu.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      } else {
        setIsOpen(open);
      }
    }}>
      {!editingRule && (
        <DialogTrigger asChild>
          <Button 
            onClick={resetForm}
            size={isCompact ? "default" : "lg"}
            className={isCompact ? "" : "px-8 py-3"}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCompact ? "Add Rule" : "Buat Aturan Denda Pertama"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {editingRule ? 'Edit Aturan Denda' : 'Buat Aturan Denda Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Cards about Calculation Types */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className={`border-2 cursor-pointer transition-all ${
              formData.calculation_type === 'fixed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`} onClick={() => setFormData(prev => ({ ...prev, calculation_type: 'fixed' }))}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Denda Tetap
                  {formData.calculation_type === 'fixed' && <Badge variant="default" className="text-xs">Dipilih</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-2">
                  Denda tetap tidak berubah berdasarkan durasi
                </p>
                <div className="text-xs text-blue-600 font-medium">
                  Telat 5 menit = Telat 2 jam = Rp 500.000
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 cursor-pointer transition-all ${
              formData.calculation_type === 'hourly' ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`} onClick={() => setFormData(prev => ({ ...prev, calculation_type: 'hourly' }))}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Per Jam
                  {formData.calculation_type === 'hourly' && <Badge variant="default" className="text-xs">Dipilih</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-2">
                  Denda berdasarkan durasi × tarif per jam
                </p>
                <div className="text-xs text-green-600 font-medium">
                  2 jam × Rp 50.000 = Rp 100.000
                </div>
              </CardContent>
            </Card>

            <Card className={`border-2 cursor-pointer transition-all ${
              formData.calculation_type === 'salary_percentage' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`} onClick={() => setFormData(prev => ({ ...prev, calculation_type: 'salary_percentage' }))}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Persentase Gaji
                  {formData.calculation_type === 'salary_percentage' && <Badge variant="default" className="text-xs">Dipilih</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-2">
                  Denda berdasarkan % dari gaji karyawan
                </p>
                <div className="text-xs text-purple-600 font-medium">
                  5% × Rp 10.000.000 = Rp 500.000
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nama Aturan *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Denda Keterlambatan Standar"
                required
              />
            </div>
            <div>
              <Label htmlFor="rule_type">Jenis Pelanggaran *</Label>
              <Select 
                value={formData.rule_type} 
                onValueChange={(value: RuleType) => setFormData(prev => ({ ...prev, rule_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late_arrival">Terlambat Masuk</SelectItem>
                  <SelectItem value="early_departure">Pulang Lebih Awal</SelectItem>
                  <SelectItem value="no_checkout">Tidak Check-out</SelectItem>
                  <SelectItem value="invalid_location">Lokasi Tidak Valid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="threshold_minutes">Batas Waktu (menit) *</Label>
              <Input
                id="threshold_minutes"
                type="number"
                min="0"
                value={formData.threshold_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, threshold_minutes: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Denda akan berlaku setelah melewati batas ini
              </p>
            </div>
            <div>
              <Label htmlFor="penalty_type">Jenis Penalti</Label>
              <Select 
                value={formData.penalty_type} 
                onValueChange={(value: PenaltyType) => setFormData(prev => ({ ...prev, penalty_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deduction">Potongan Gaji</SelectItem>
                  <SelectItem value="warning">Peringatan</SelectItem>
                  <SelectItem value="points">Sistem Poin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculation Specific Fields */}
          {formData.calculation_type === 'fixed' && (
            <div>
              <Label htmlFor="penalty_amount">Jumlah Denda Tetap (Rp) *</Label>
              <Input
                id="penalty_amount"
                type="number"
                min="0"
                step="1000"
                value={formData.penalty_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, penalty_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          )}

          {formData.calculation_type === 'hourly' && (
            <div>
              <Label htmlFor="hourly_rate">Tarif Per Jam (Rp) *</Label>
              <Input
                id="hourly_rate"
                type="number"
                min="0"
                step="1000"
                value={formData.hourly_rate || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                placeholder="50000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Denda akan dihitung: durasi keterlambatan (jam) × tarif per jam
              </p>
            </div>
          )}

          {formData.calculation_type === 'salary_percentage' && (
            <div>
              <Label htmlFor="salary_percentage">Persentase Gaji (%) *</Label>
              <Input
                id="salary_percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.salary_percentage || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, salary_percentage: parseFloat(e.target.value) || 0 }))}
                placeholder="5.0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Denda akan dihitung: (persentase ÷ 100) × gaji bulanan karyawan
              </p>
            </div>
          )}

          {/* Calculation Example */}
          <Alert>
            <DollarSign className="h-4 w-4" />
            <AlertDescription>
              <strong>Simulasi Perhitungan:</strong> {calculateExample()}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_penalty_per_month">Batas Denda Maksimal Per Bulan (Rp)</Label>
              <Input
                id="max_penalty_per_month"
                type="number"
                min="0"
                step="1000"
                value={formData.max_penalty_per_month || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, max_penalty_per_month: parseFloat(e.target.value) || undefined }))}
                placeholder="Tidak terbatas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Kosongkan untuk tidak ada batas maksimal
              </p>
            </div>
            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi aturan denda ini..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="applies_to_all"
                checked={formData.applies_to_all}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, applies_to_all: checked }))}
              />
              <Label htmlFor="applies_to_all">Berlaku untuk semua karyawan</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Aktifkan aturan ini</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button type="submit">
              {editingRule ? 'Update Aturan' : 'Buat Aturan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
