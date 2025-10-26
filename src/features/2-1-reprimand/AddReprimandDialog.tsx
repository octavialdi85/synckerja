import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Checkbox } from '@/features/ui/checkbox';
import { FileUpload } from '@/features/ui/file-upload';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/features/ui/form';
import { useCreateReprimand, CreateReprimandData } from './hooks/useReprimands';
import { useEmployees } from './hooks/useEmployees';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';

const reprimandSchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  reprimand_type: z.enum(['verbal_warning', 'written_warning', 'final_warning', 'suspension', 'termination']),
  severity_level: z.enum(['low', 'medium', 'high', 'critical']),
  violation_category: z.enum(['attendance', 'performance', 'conduct', 'safety', 'policy_violation', 'insubordination', 'other']),
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_time: z.string().optional(),
  incident_location: z.string().optional(),
  violation_description: z.string().min(1, 'Violation description is required'),
  evidence_details: z.string().optional(),
  witness_names: z.string().optional(),
  previous_warnings_count: z.number().min(0).default(0),
  corrective_action_plan: z.string().optional(),
  improvement_deadline: z.string().optional(),
  follow_up_date: z.string().optional(),
  acknowledgment_required: z.boolean().default(true),
  is_formal: z.boolean().default(true),
  impact_on_performance_review: z.boolean().default(true),
  notes: z.string().optional(),
  document_path: z.string().optional(),
});

export const AddReprimandDialog = () => {
  const [open, setOpen] = useState(false);
  const { employees, isLoading: employeesLoading } = useEmployees();
  const createReprimand = useCreateReprimand();
  const { user } = useCurrentUser();

  const form = useForm<any>({
    resolver: zodResolver(reprimandSchema),
    defaultValues: {
      employee_id: '',
      reprimand_type: 'verbal_warning',
      severity_level: 'medium',
      violation_category: 'conduct',
      incident_date: new Date().toISOString().split('T')[0],
      incident_time: '',
      incident_location: '',
      violation_description: '',
      evidence_details: '',
      witness_names: '',
      previous_warnings_count: 0,
      corrective_action_plan: '',
      improvement_deadline: '',
      follow_up_date: '',
      acknowledgment_required: true,
      is_formal: true,
      impact_on_performance_review: true,
      notes: '',
      document_path: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      if (!user?.id) {
        console.error('No user ID available');
        return;
      }
      
      const reprimandData = {
        ...data,
        issued_by: user.id,
      };
      await createReprimand.mutateAsync(reprimandData);
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Failed to create reprimand:', error);
    }
  };

  const reprimandTypes = [
    { value: 'verbal_warning', label: 'Verbal Warning' },
    { value: 'written_warning', label: 'Written Warning' },
    { value: 'final_warning', label: 'Final Warning' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'termination', label: 'Termination' },
  ];

  const severityLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  const violationCategories = [
    { value: 'attendance', label: 'Attendance' },
    { value: 'performance', label: 'Performance' },
    { value: 'conduct', label: 'Conduct' },
    { value: 'safety', label: 'Safety' },
    { value: 'policy_violation', label: 'Policy Violation' },
    { value: 'insubordination', label: 'Insubordination' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Reprimand
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden" aria-describedby="add-reprimand-description">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Add New Reprimand</DialogTitle>
          <p id="add-reprimand-description" className="text-sm text-gray-600 mt-1">
            Create a new disciplinary action record for an employee
          </p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 relative z-0 bg-background min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Selection */}
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employeesLoading ? (
                            <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                          ) : employees.length > 0 ? (
                            employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                                {employee.full_name} ({employee.employee_id || 'No ID'})
                            </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-employees" disabled>No employees found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reprimand Type */}
                <FormField
                  control={form.control}
                  name="reprimand_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reprimand Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reprimand type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reprimandTypes.map((type) => (
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

                {/* Severity Level */}
                <FormField
                  control={form.control}
                  name="severity_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity Level *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {severityLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Violation Category */}
                <FormField
                  control={form.control}
                  name="violation_category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Violation Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select violation category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {violationCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Incident Date */}
                <FormField
                  control={form.control}
                  name="incident_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Incident Time */}
                <FormField
                  control={form.control}
                  name="incident_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Incident Location */}
                <FormField
                  control={form.control}
                  name="incident_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter incident location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Previous Warnings Count */}
                <FormField
                  control={form.control}
                  name="previous_warnings_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Warnings Count</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Improvement Deadline */}
                <FormField
                  control={form.control}
                  name="improvement_deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Improvement Deadline</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Follow Up Date */}
                <FormField
                  control={form.control}
                  name="follow_up_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow Up Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Violation Description */}
              <FormField
                control={form.control}
                name="violation_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Violation Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the violation in detail..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Evidence Details */}
              <FormField
                control={form.control}
                name="evidence_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any evidence supporting this reprimand..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Witness Names */}
              <FormField
                control={form.control}
                name="witness_names"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Witness Names</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter witness names (comma separated)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Corrective Action Plan */}
              <FormField
                control={form.control}
                name="corrective_action_plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corrective Action Plan</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the corrective actions required..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload */}
              <FormField
                control={form.control}
                name="document_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supporting Document</FormLabel>
                    <FormControl>
                      <FileUpload
                        id="reprimand-document"
                        label="Upload supporting document"
                        value={field.value}
                        onChange={field.onChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        maxSize={10 * 1024 * 1024} // 10MB
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional notes or comments..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="acknowledgment_required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Acknowledgment Required</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_formal"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Formal Reprimand</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="impact_on_performance_review"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Impact Performance Review</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sticky Footer - Inside container */}
            <div className="flex-shrink-0 px-6 py-4 border-t bg-background relative z-20">
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createReprimand.isPending}
                  className="min-w-[100px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createReprimand.isPending}
                  className="bg-red-600 hover:bg-red-700 min-w-[140px]"
                >
                  {createReprimand.isPending ? 'Creating...' : 'Create Reprimand'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
