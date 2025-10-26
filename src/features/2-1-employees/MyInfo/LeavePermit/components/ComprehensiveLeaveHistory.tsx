import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { 
  Calendar, 
  Clock, 
  Gift, 
  TrendingUp, 
  FileCheck,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Hourglass,
  Info,
  CalendarDays
} from 'lucide-react';
import { Label } from '@/features/ui/label';
import { InfoTooltip } from './info-tooltip';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useEmployeeLeaveRequests } from '../hooks/useEmployeeLeaveRequests';
import { useEmployeeLeaveAllocations } from '../hooks/useEmployeeLeaveAllocations';
import { useLeavePolicy } from '../hooks/useLeavePolicy';
import { useEmployeeLeaveBalance } from '../hooks/useEmployeeLeaveBalance';
import { parseDateFromDatabase } from '../utils/dateUtils';

interface ComprehensiveLeaveHistoryProps {
  employeeId: string;
  organizationId: string;
}

export const ComprehensiveLeaveHistory = ({ employeeId, organizationId }: ComprehensiveLeaveHistoryProps) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: leaveRequests = [], isLoading: requestsLoading } = useEmployeeLeaveRequests({
    employeeId,
    status: statusFilter,
    year: selectedYear
  });

  const { data: leaveAllocations = [], isLoading: allocationsLoading } = useEmployeeLeaveAllocations(employeeId);
  const { data: leavePolicy, isLoading: policyLoading } = useLeavePolicy(organizationId);
  const { data: leaveBalance, isLoading: balanceLoading } = useEmployeeLeaveBalance();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Hourglass className="h-4 w-4 text-yellow-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Menunggu', variant: 'secondary' as const },
      approved: { label: 'Disetujui', variant: 'default' as const },
      rejected: { label: 'Ditolak', variant: 'destructive' as const },
      cancelled: { label: 'Dibatalkan', variant: 'outline' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLeaveTypeLabel = (type: string) => {
    const typeLabels = {
      annual: 'Cuti Tahunan',
      sick: 'Cuti Sakit', 
      maternity: 'Cuti Melahirkan',
      paternity: 'Cuti Ayah',
      personal: 'Cuti Pribadi',
      emergency: 'Cuti Darurat',
      unpaid: 'Cuti Tanpa Gaji',
    };
    
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getAllocationIcon = (type: string) => {
    switch (type) {
      case 'annual_grant':
        return <Calendar className="h-4 w-4" />;
      case 'bonus':
        return <Gift className="h-4 w-4" />;
      case 'carry_over':
        return <TrendingUp className="h-4 w-4" />;
      case 'manual_adjustment':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getAllocationTypeLabel = (type: string) => {
    switch (type) {
      case 'annual_grant':
        return 'Cuti Tahunan';
      case 'bonus':
        return 'Cuti Bonus';
      case 'carry_over':
        return 'Cuti Dibawa';
      case 'manual_adjustment':
        return 'Penyesuaian Manual';
      default:
        return type;
    }
  };

  // Calculate statistics
  const totalDaysUsed = leaveRequests
    .filter(req => req.status === 'approved')
    .reduce((sum, req) => sum + req.total_days, 0);
  
  const pendingDays = leaveRequests
    .filter(req => req.status === 'pending')
    .reduce((sum, req) => sum + req.total_days, 0);

  const totalAllocated = leaveAllocations?.reduce((sum, allocation) => sum + allocation.days_allocated, 0) || 0;

  const expiredAllocations = leaveAllocations?.filter(allocation => 
    allocation.expires_at && new Date(allocation.expires_at) < new Date()
  ) || [];
  
  const expiredDays = expiredAllocations.reduce((sum, allocation) => sum + allocation.days_allocated, 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (requestsLoading || allocationsLoading || policyLoading || balanceLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Memuat data riwayat cuti...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sisa Cuti</p>
                <p className="text-2xl font-bold">{leaveBalance?.remainingLeave || 0}</p>
                <p className="text-xs text-muted-foreground">hari</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cuti Terpakai</p>
                <p className="text-2xl font-bold">{totalDaysUsed}</p>
                <p className="text-xs text-muted-foreground">hari tahun ini</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Menunggu</p>
                <p className="text-2xl font-bold">{pendingDays}</p>
                <p className="text-xs text-muted-foreground">hari</p>
              </div>
              <Hourglass className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alokasi</p>
                <p className="text-2xl font-bold">{totalAllocated}</p>
                <p className="text-xs text-muted-foreground">hari</p>
              </div>
              <Gift className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">Riwayat Pengajuan</TabsTrigger>
          <TabsTrigger value="allocations">Alokasi Cuti</TabsTrigger>
          <TabsTrigger value="policy">Kebijakan Cuti</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Riwayat Pengajuan Cuti
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="pending">Menunggu</SelectItem>
                      <SelectItem value="approved">Disetujui</SelectItem>
                      <SelectItem value="rejected">Ditolak</SelectItem>
                      <SelectItem value="cancelled">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leaveRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Belum ada riwayat pengajuan cuti</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{getLeaveTypeLabel(request.leave_type)}</h4>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(parseDateFromDatabase(request.start_date), 'dd MMM yyyy', { locale: id })} - {' '}
                            {format(parseDateFromDatabase(request.end_date), 'dd MMM yyyy', { locale: id })}
                          </p>
                          <p className="text-sm text-muted-foreground">{request.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{request.total_days} hari</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Alokasi Cuti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaveAllocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>Belum ada alokasi cuti</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveAllocations.map((allocation) => {
                    const isExpired = allocation.expires_at && new Date(allocation.expires_at) < new Date();
                    
                    return (
                      <div
                        key={allocation.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isExpired ? 'bg-destructive/5 border-destructive/20' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            isExpired ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                          }`}>
                            {getAllocationIcon(allocation.allocation_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{getAllocationTypeLabel(allocation.allocation_type)}</h4>
                              {isExpired && (
                                <Badge variant="outline" className="text-destructive border-destructive">
                                  Expired
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">{allocation.allocation_reason}</p>
                            {allocation.notes && (
                              <p className="text-sm text-muted-foreground">{allocation.notes}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span>Diberikan: {format(new Date(allocation.allocation_date), 'dd MMM yyyy', { locale: id })}</span>
                              {allocation.expires_at && (
                                <span>
                                  Berakhir: {format(new Date(allocation.expires_at), 'dd MMM yyyy', { locale: id })}
                                </span>
                              )}
                            </div>
                            {allocation.allocation_type === 'annual_grant' && (
                              <div className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
                                ℹ️ Cuti tahunan berlaku untuk tahun kalender (1 Jan - 31 Des). Sisa cuti tidak dibawa ke tahun berikutnya.
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            isExpired ? 'text-destructive' : 'text-foreground'
                          }`}>
                            +{allocation.days_allocated} hari
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
          {leavePolicy ? (
            <div className="space-y-8">
              {/* Strategy Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Strategi Pemberian Cuti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
                      {leavePolicy.leave_strategy === 'after_probation' ? (
                        <>
                          <Users className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <div className="font-medium">Otomatis setelah masa probation selesai</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Karyawan langsung mendapat hak cuti penuh setelah masa probation berakhir
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Clock className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <div className="font-medium">Setelah masa kerja tertentu</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Karyawan mendapat hak cuti setelah bekerja dalam jangka waktu yang ditentukan
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Konfigurasi Kebijakan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {leavePolicy.leave_strategy === 'after_probation' ? (
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-base font-medium">
                          <Users className="h-4 w-4" />
                          Durasi Masa Probation
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-primary">{leavePolicy.probation_months}</div>
                          <span className="text-muted-foreground">bulan</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Masa probation sebelum karyawan mendapat hak cuti
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-base font-medium">
                          <Clock className="h-4 w-4" />
                          Cuti Diberikan Setelah
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-primary">{leavePolicy.leave_grant_after_months}</div>
                          <span className="text-muted-foreground">bulan kerja</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Waktu tunggu sebelum karyawan mendapat hak cuti
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-base font-medium">
                        <CalendarDays className="h-4 w-4" />
                        Jumlah Cuti Tahunan
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-primary">{leavePolicy.annual_leave_days}</div>
                        <span className="text-muted-foreground">hari per tahun</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total hari cuti yang diberikan setiap tahun
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Summary */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900">Sistem Cuti Tahunan</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Ringkasan kebijakan cuti yang diterapkan
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium">Periode:</span>
                      <span>Tahun kalender (1 Jan - 31 Des)</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium">Pembaruan:</span>
                      <span>Otomatis setiap 1 Januari</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium">Sisa cuti:</span>
                      <span>Hangus per 31 Desember</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium">Carry Over:</span>
                      <span>Tidak ada (0 hari)</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="font-medium">Alokasi baru:</span>
                      <span>{leavePolicy.annual_leave_days} hari setiap tahun</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3">Kebijakan Eligibilitas</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                        <span>
                          Karyawan mendapat <strong>{leavePolicy.annual_leave_days} hari</strong> cuti per tahun
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {leavePolicy.leave_strategy === 'after_probation' ? (
                          <Users className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-600" />
                        )}
                        <span>
                          {leavePolicy.leave_strategy === 'after_probation' 
                            ? `Hak cuti otomatis setelah probation ${leavePolicy.probation_months} bulan selesai`
                            : `Hak cuti mulai setelah ${leavePolicy.leave_grant_after_months} bulan kerja`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Kebijakan Cuti Belum Ditetapkan</h3>
                <p className="text-muted-foreground">
                  Hubungi HR atau administrator untuk mengatur kebijakan cuti perusahaan.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

