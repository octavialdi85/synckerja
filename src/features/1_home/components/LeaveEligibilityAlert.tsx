import { Alert, AlertDescription } from '@/features/ui/alert';
import { Badge } from '@/features/ui/badge';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useEmployeeLeaveEligibility } from './useEmployeeLeaveEligibility';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const LeaveEligibilityAlert = () => {
  const { data: eligibility, isLoading } = useEmployeeLeaveEligibility();

  if (isLoading) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Memuat informasi kelayakan cuti...
        </AlertDescription>
      </Alert>
    );
  }

  if (!eligibility) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Tidak dapat memuat informasi kelayakan cuti
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {/* Eligibility Status */}
      <Alert variant={eligibility.isEligible ? "default" : "destructive"}>
        {eligibility.isEligible ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <AlertDescription className="flex items-center justify-between">
          <span>{eligibility.message}</span>
          <Badge variant={eligibility.isEligible ? "default" : "secondary"}>
            {eligibility.isEligible ? "Berhak Cuti" : "Belum Berhak"}
          </Badge>
        </AlertDescription>
      </Alert>

      {/* Leave Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <Calendar className="h-4 w-4" />
            Sisa Cuti
          </div>
          <p className="text-2xl font-bold">
            {eligibility.remainingDays} hari
          </p>
          <p className="text-sm text-muted-foreground">
            dari {eligibility.annualLeaveEntitlement} hari/tahun
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-1">
            <Clock className="h-4 w-4" />
            Strategi Cuti
          </div>
          <p className="text-sm">
            {eligibility.strategy === 'after_probation' 
              ? 'Setelah Probation' 
              : 'Setelah Masa Kerja'
            }
          </p>
        </div>

        {eligibility.eligibilityDate && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Calendar className="h-4 w-4" />
              Tanggal Hak Cuti
            </div>
            <p className="text-sm">
              {format(eligibility.eligibilityDate, 'dd MMM yyyy', { locale: id })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

