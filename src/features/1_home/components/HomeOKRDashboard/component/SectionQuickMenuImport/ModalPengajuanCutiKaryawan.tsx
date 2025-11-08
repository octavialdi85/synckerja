import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { CustomDatePicker } from '@/features/share/calendar/CustomDatePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/features/ui/form';
import { CalendarIcon, User, Building, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentEmployee } from '@/features/share/hooks/useCurrentEmployee';
import { useLeaveRequest } from '../../../../hooks/useLeaveRequest';
import { useEmployeeLeaveEligibility } from '../../../../hooks/useEmployeeLeaveEligibility';
import { LeaveEligibilityAlert } from '../../../../components/LeaveEligibilityAlert';

const leaveRequestSchema = z.object({
  leaveType: z.string().min(1, 'Jenis cuti harus dipilih'),
  startDate: z.date({
    required_error: 'Tanggal mulai harus diisi'
  }),
  endDate: z.date({
    required_error: 'Tanggal selesai harus diisi'
  }),
  reason: z.string().min(10, 'Alasan cuti minimal 10 karakter'),
  emergencyContact: z.string().min(5, 'Kontak darurat harus diisi'),
  workHandover: z.string().min(10, 'Serah terima pekerjaan minimal 10 karakter')
}).refine(data => data.endDate >= data.startDate, {
  message: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai',
  path: ['endDate']
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

interface ModalPengajuanCutiKaryawanProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeaveRequestFormData) => void;
}

const leaveTypes = [{
  value: 'annual',
  label: 'Cuti Tahunan'
}, {
  value: 'sick',
  label: 'Cuti Sakit'
}, {
  value: 'maternity',
  label: 'Cuti Melahirkan'
}, {
  value: 'paternity',
  label: 'Cuti Ayah'
}, {
  value: 'personal',
  label: 'Cuti Pribadi'
}, {
  value: 'emergency',
  label: 'Cuti Darurat'
}, {
  value: 'unpaid',
  label: 'Cuti Tanpa Gaji'
}];

export const ModalPengajuanCutiKaryawan: React.FC<ModalPengajuanCutiKaryawanProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const {
    data: employeeData,
    isLoading: employeeLoading
  } = useCurrentEmployee();
  const {
    createLeaveRequest,
    isLoading
  } = useLeaveRequest();
  const {
    data: eligibility,
    isLoading: eligibilityLoading
  } = useEmployeeLeaveEligibility();
  
  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      leaveType: '',
      reason: '',
      emergencyContact: '',
      workHandover: ''
    }
  });

  const handleSubmit = async (data: LeaveRequestFormData) => {
    console.log('Form submitted with data:', data);
    try {
      await createLeaveRequest(data);
      form.reset();
      onClose();
      onSubmit(data);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  const calculateDays = () => {
    const startDate = form.watch('startDate');
    const endDate = form.watch('endDate');
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const requestedDays = calculateDays();
  const remainingAfterRequest = eligibility ? eligibility.remainingDays - requestedDays : 0;
  const isEligibleForRequest = eligibility?.isEligible && requestedDays > 0 && remainingAfterRequest >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[500px] h-[500px] max-h-[500px] overflow-y-auto p-0" style={{ zIndex: 50 }}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-20">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Pengajuan Cuti Karyawan
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Ajukan permohonan cuti dengan melengkapi informasi karyawan, jenis cuti, dan periode yang diinginkan.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 px-6 pb-20">
            {/* Leave Eligibility Alert */}
            <LeaveEligibilityAlert />

            {/* Employee Info Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Informasi Karyawan</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Nama Karyawan</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employeeLoading ? 'Loading...' : (
                        employeeData?.full_name || 'Tidak tersedia'
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Departemen</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employeeLoading ? (
                        'Loading...'
                      ) : employeeData?.departments?.name ? (
                        employeeData.departments.name
                      ) : (
                        <span className="text-red-500 italic">Tidak tersedia</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Join Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {employeeLoading ? (
                        'Loading...'
                      ) : employeeData?.join_date || employeeData?.hire_date ? (
                        format(new Date(employeeData.join_date || employeeData.hire_date), 'dd MMM yyyy', { locale: id })
                      ) : (
                        <span className="text-orange-500">N/A</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Sisa Cuti</p>
                    <p className="text-sm font-medium text-gray-900">
                      {eligibilityLoading ? (
                        'Loading...'
                      ) : eligibility ? (
                        <span className="text-orange-500">
                          {eligibility.remainingDays} hari 
                          <span className="text-gray-500"> dari {eligibility.annualLeaveEntitlement} hari/tahun</span>
                        </span>
                      ) : (
                        <span className="text-red-500 italic">Tidak tersedia</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Detail Pengajuan Cuti</h3>
              
              {/* Department Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">
                    Departemen: {employeeLoading ? (
                      'Loading...'
                    ) : employeeData?.departments?.name ? (
                      employeeData.departments.name
                    ) : (
                      <span className="text-red-600">Tidak ada departemen</span>
                    )}
                  </span>
                </p>
              </div>
              
              <FormField 
                control={form.control} 
                name="leaveType" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Jenis Cuti <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis cuti" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leaveTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  control={form.control} 
                  name="startDate" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Tanggal Mulai <span className="text-red-500">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd MMMM yyyy", {
                                locale: id
                              }) : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CustomDatePicker 
                            selected={field.value} 
                            onSelect={field.onChange} 
                            disabled={date => date < new Date()} 
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} 
                />

                <FormField 
                  control={form.control} 
                  name="endDate" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Tanggal Selesai <span className="text-red-500">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd MMMM yyyy", {
                                locale: id
                              }) : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CustomDatePicker 
                            selected={field.value} 
                            onSelect={field.onChange} 
                            disabled={date => {
                              const startDate = form.getValues('startDate');
                              return date < new Date() || (startDate && date < startDate);
                            }} 
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>

              {requestedDays > 0 && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      <span className="font-medium">Total hari cuti: {requestedDays} hari</span>
                    </p>
                  </div>
                  
                  {eligibility && (
                    <div className={cn("rounded-lg p-3 border", remainingAfterRequest >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                      <div className="flex items-center gap-2">
                        {remainingAfterRequest < 0 && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        <p className={cn("text-xs font-medium", remainingAfterRequest >= 0 ? "text-green-700" : "text-red-700")}>
                          {remainingAfterRequest >= 0 ? `Sisa cuti setelah pengajuan: ${remainingAfterRequest} hari` : `Kekurangan cuti: ${Math.abs(remainingAfterRequest)} hari (Sisa cuti Anda hanya ${eligibility.remainingDays} hari)`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <FormField 
                control={form.control} 
                name="reason" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Alasan Cuti <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Jelaskan alasan mengajukan cuti..." 
                        className="min-h-[100px] resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Minimal 10 karakter ({field.value?.length || 0}/10)
                    </p>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <FormField 
                control={form.control} 
                name="emergencyContact" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Kontak Darurat <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nama dan nomor telepon yang dapat dihubungi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <FormField 
                control={form.control} 
                name="workHandover" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Serah Terima Pekerjaan <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Jelaskan pekerjaan yang akan diserahkan dan kepada siapa..." 
                        className="min-h-[100px] resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      Minimal 10 karakter ({field.value?.length || 0}/10)
                    </p>
                    <FormMessage />
                  </FormItem>
                )} 
              />
            </div>
          </form>
        </Form>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-sm" disabled={isLoading}>
              Batal
            </Button>
            <Button 
              type="submit" 
              onClick={form.handleSubmit(handleSubmit)} 
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm" 
              disabled={isLoading || !isEligibleForRequest || eligibilityLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengajukan...
                </>
              ) : eligibilityLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memuat...
                </>
              ) : !eligibility?.isEligible ? (
                'Belum Berhak Cuti'
              ) : remainingAfterRequest < 0 ? (
                'Sisa Cuti Tidak Mencukupi'
              ) : (
                'Ajukan Cuti'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

