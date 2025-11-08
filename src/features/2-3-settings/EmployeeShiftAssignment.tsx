import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Calendar, Save, X, Search } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Badge } from '@/features/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Switch } from '@/features/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/features/ui/use-toast';

interface Employee {
  id: string;
  full_name: string;
  employee_id: string;
}

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_id: string;
  effective_from_date: string;
  effective_to_date: string | null;
  is_active: boolean;
  employees: Employee;
  shifts: Shift;
}

export const EmployeeShiftAssignment = () => {
  const [assignments, setAssignments] = useState<EmployeeShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeShift | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    employee_id: '',
    shift_id: '',
    effective_from_date: '',
    effective_to_date: '',
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.active_organization_id) return;

      // Fetch assignments with employee and shift details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('employee_shifts')
        .select(`
          *,
          employees!inner(id, full_name, employee_id),
          shifts!inner(id, name, start_time, end_time)
        `)
        .eq('organization_id', profile.active_organization_id)
        .order('effective_from_date', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, employee_id')
        .eq('organization_id', profile.active_organization_id)
        .order('full_name');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Fetch shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('id, name, start_time, end_time')
        .eq('organization_id', profile.active_organization_id)
        .eq('is_active', true)
        .order('name');

      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      shift_id: '',
      effective_from_date: '',
      effective_to_date: '',
      is_active: true
    });
    setEditingAssignment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.active_organization_id) {
        toast({
          title: "Error",
          description: "Organisasi tidak ditemukan",
          variant: "destructive"
        });
        return;
      }

      const submitData = {
        ...formData,
        effective_to_date: formData.effective_to_date || null,
        organization_id: profile.active_organization_id
      };

      if (editingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('employee_shifts')
          .update(submitData)
          .eq('id', editingAssignment.id);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Penugasan shift berhasil diperbarui"
        });
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('employee_shifts')
          .insert(submitData);

        if (error) throw error;
        
        toast({
          title: "Berhasil",
          description: "Penugasan shift berhasil dibuat"
        });
      }

      resetForm();
      setShowCreateDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan penugasan shift",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (assignment: EmployeeShift) => {
    setFormData({
      employee_id: assignment.employee_id,
      shift_id: assignment.shift_id,
      effective_from_date: assignment.effective_from_date,
      effective_to_date: assignment.effective_to_date || '',
      is_active: assignment.is_active
    });
    setEditingAssignment(assignment);
    setShowCreateDialog(true);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus penugasan shift ini?')) return;

    try {
      const { error } = await supabase
        .from('employee_shifts')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      
      toast({
        title: "Berhasil",
        description: "Penugasan shift berhasil dihapus"
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus penugasan shift",
        variant: "destructive"
      });
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // Format HH:MM
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        // Try parsing as ISO date format (YYYY-MM-DD)
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-');
          const validDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          
          if (!isNaN(validDate.getTime())) {
            return validDate.toLocaleDateString('id-ID');
          }
        }
        return dateString; // Return original string if all parsing fails
      }
      
      return date.toLocaleDateString('id-ID');
    } catch (error) {
      console.error('Error formatting date:', error, 'for date:', dateString);
      return dateString;
    }
  };

  const shiftOptionLabel = (shift: Shift) => `${shift.name} (${shift.start_time} - ${shift.end_time})`;

  const filteredAssignments = assignments.filter(assignment =>
    assignment.employees.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.employees.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assignment.shifts.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Memuat data penugasan shift...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cari karyawan atau shift..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Tugaskan Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAssignment ? 'Edit Penugasan Shift' : 'Tugaskan Shift Baru'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="employee_id">Karyawan</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name} ({employee.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="shift_id">Shift</Label>
                <Select
                  value={formData.shift_id}
                  onValueChange={(value) => setFormData({ ...formData, shift_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shiftOptionLabel(shift)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="effective_from_date">Tanggal Mulai Berlaku</Label>
                <Input
                  id="effective_from_date"
                  type="date"
                  value={formData.effective_from_date}
                  onChange={(e) => setFormData({ ...formData, effective_from_date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="effective_to_date">Tanggal Berakhir (Opsional)</Label>
                <Input
                  id="effective_to_date"
                  type="date"
                  value={formData.effective_to_date}
                  onChange={(e) => setFormData({ ...formData, effective_to_date: e.target.value })}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktif</Label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingAssignment ? 'Update' : 'Simpan'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Tidak ada hasil pencarian' : 'Belum ada penugasan shift'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Coba kata kunci pencarian yang berbeda' : 'Mulai dengan menugaskan karyawan ke shift'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tugaskan Shift
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {assignment.employees.full_name}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        ID: {assignment.employees.employee_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={assignment.is_active ? "default" : "secondary"}>
                      {assignment.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(assignment)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Shift</p>
                    <p className="font-medium">{assignment.shifts.name}</p>
                    <p className="text-gray-500">
                      {formatTime(assignment.shifts.start_time)} - {formatTime(assignment.shifts.end_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tanggal Berlaku</p>
                    <p className="font-medium">
                      {formatDate(assignment.effective_from_date)}
                      {assignment.effective_to_date && (
                        <> - {formatDate(assignment.effective_to_date)}</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-medium">
                      {assignment.is_active ? 'Aktif' : 'Nonaktif'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
