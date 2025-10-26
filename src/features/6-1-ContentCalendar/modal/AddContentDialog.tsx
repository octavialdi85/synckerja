import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useToast } from '@/features/ui/use-toast';
import { useSocialMediaMutations } from '@/features/6-1-dashboard/hook/useOptimizedSocialMediaState';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import './AddContentDialog.css';

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
}

interface Employee {
  id: string;
  full_name: string;
  user_id: string;
}

export const AddContentDialog: React.FC<AddContentDialogProps> = ({
  open,
  onOpenChange,
  selectedDate
}) => {
  const { toast } = useToast();
  const { organizationId } = useCurrentOrg();
  const { addContentPlan } = useSocialMediaMutations();
  
  // State for master data - simplified approach
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [subServices, setSubServices] = useState<any[]>([]);
  const [contentPillars, setContentPillars] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    brief: '',
    service_id: '',
    sub_service_id: '',
    content_pillar_id: '',
    content_type_id: '',
    pic_id: ''
  });
  const [filteredSubServices, setFilteredSubServices] = useState<any[]>([]);

  // Simplified master data loading function
  const loadMasterData = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch all master data in parallel
      const [contentTypesResult, servicesResult, subServicesResult, contentPillarsResult] = await Promise.all([
        supabase
          .from('content_types')
          .select('*')
          .or(`organization_id.eq.${organizationId},organization_id.is.null`)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('services')
          .select('*')
          .or(`organization_id.eq.${organizationId},organization_id.is.null`)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('sub_services')
          .select('*')
          .or(`organization_id.eq.${organizationId},organization_id.is.null`)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('content_pillars')
          .select('*')
          .or(`organization_id.eq.${organizationId},organization_id.is.null`)
          .eq('is_active', true)
          .order('name')
      ]);

      // Check for errors
      if (contentTypesResult.error) throw contentTypesResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (subServicesResult.error) throw subServicesResult.error;
      if (contentPillarsResult.error) throw contentPillarsResult.error;

      setContentTypes(contentTypesResult.data || []);
      setServices(servicesResult.data || []);
      setSubServices(subServicesResult.data || []);
      setContentPillars(contentPillarsResult.data || []);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast({
        title: "Error",
        description: "Failed to load master data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, toast]);

  // Load master data when modal opens
  useEffect(() => {
    if (open && organizationId) {
      loadMasterData();
    }
  }, [open, organizationId, loadMasterData]);

  // Filter sub services based on selected service
  useEffect(() => {
    if (formData.service_id && subServices.length > 0) {
      const filtered = subServices.filter(subService => 
        subService.service_id === formData.service_id
      );
      setFilteredSubServices(filtered);
    } else {
      setFilteredSubServices([]);
    }
  }, [formData.service_id, subServices]);

  // Fetch current user's employee profile
  useEffect(() => {
    const fetchCurrentEmployee = async () => {
      if (!organizationId) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: employee, error } = await supabase
          .from('employees')
          .select('id, full_name, user_id')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .single() as { data: Employee | null; error: any };

        if (error) {
          console.error('Error fetching employee:', error);
          return;
        }

        setCurrentEmployee(employee);
        if (employee) {
          setFormData(prev => ({
            ...prev,
            pic_id: employee.id
          }));
        }
      } catch (error) {
        console.error('Error fetching current employee:', error);
      }
    };

    if (open && organizationId) {
      fetchCurrentEmployee();
    }
  }, [open, organizationId]);

  // Filter sub services based on selected service
  useEffect(() => {
    if (formData.service_id) {
      const filtered = subServices.filter(sub => sub.service_id === formData.service_id);
      setFilteredSubServices(filtered);
    } else {
      setFilteredSubServices([]);
      setFormData(prev => ({ ...prev, sub_service_id: '' }));
    }
  }, [formData.service_id, subServices]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        brief: '',
        service_id: '',
        sub_service_id: '',
        content_pillar_id: '',
        content_type_id: '',
        pic_id: currentEmployee?.id || ''
      });
      setLoading(false);
    }
  }, [open, currentEmployee?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !organizationId) {
      toast({
        title: "Error",
        description: "Missing required data",
        variant: "destructive"
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Error", 
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }

    if (!currentEmployee) {
      toast({
        title: "Error", 
        description: "Employee information not found",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const newContentData = {
        organization_id: organizationId,
        post_date: format(selectedDate, 'yyyy-MM-dd'),
        title: formData.title.trim(),
        brief: formData.brief.trim() || null,
        service_id: formData.service_id || null,
        sub_service_id: formData.sub_service_id || null,
        content_pillar_id: formData.content_pillar_id || null,
        content_type_id: formData.content_type_id || null,
        pic_id: formData.pic_id || null,
        status: "",
        revision_count: 0,
        approved: false,
        completion_date: null,
        pic_production_id: null,
        google_drive_link: null,
        production_status: "",
        production_revision_count: 0,
        production_completion_date: null,
        production_approved: false,
        production_approved_date: null,
        post_link: null,
        done: false,
        actual_post_date: null,
        on_time_status: "",
        status_content: ""
      };

      await addContentPlan(newContentData);
      
      toast({
        title: "Success",
        description: "Content plan created successfully"
      });
      
      // Reset form
      setFormData({
        title: '',
        brief: '',
        service_id: '',
        sub_service_id: '',
        content_pillar_id: '',
        content_type_id: '',
        pic_id: currentEmployee.id
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating content plan:', error);
      toast({
        title: "Error",
        description: "Failed to create content plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto seamless-scroll" style={{ zIndex: 999999 }}>
        <DialogHeader>
          <DialogTitle>
            Add New Content Plan - {selectedDate && format(selectedDate, 'dd MMMM yyyy')}
          </DialogTitle>
          <DialogDescription>
            Create a new content plan for the selected date. Fill in all required fields to save your content plan.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading master data...</p>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter content title"
              required
            />
          </div>

          {/* Brief */}
          <div className="space-y-2">
            <Label htmlFor="brief">Brief</Label>
            <Textarea
              id="brief"
              value={formData.brief}
              onChange={(e) => setFormData(prev => ({ ...prev, brief: e.target.value }))}
              placeholder="Enter content brief/description"
              rows={3}
            />
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  service_id: value,
                  sub_service_id: '' // Reset sub service when service changes
                }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent 
                className="max-h-[200px] overflow-y-auto" 
                position="popper" 
                sideOffset={4}
                style={{ zIndex: 999999 }}
              >
                {services.length > 0 ? (
                  services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-services" disabled>
                    No services available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

           {/* Sub Service */}
           <div className="space-y-2">
             <Label htmlFor="subService">Sub Service</Label>
             <Select
               value={formData.sub_service_id}
               onValueChange={(value) => {
                 setFormData(prev => ({ ...prev, sub_service_id: value }));
               }}
               disabled={!formData.service_id}
             >
               <SelectTrigger className="w-full">
                 <SelectValue placeholder={formData.service_id ? "Select sub service" : "Please select service first"} />
               </SelectTrigger>
              <SelectContent 
                className="max-h-[200px] overflow-y-auto" 
                position="popper" 
                sideOffset={4}
                style={{ zIndex: 999999 }}
              >
                {filteredSubServices.length > 0 ? (
                  filteredSubServices.map((subService) => (
                    <SelectItem key={subService.id} value={subService.id}>
                      {subService.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-sub-services" disabled>
                    No sub services available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Content Pillar */}
          <div className="space-y-2">
            <Label htmlFor="pillar">Content Pillar</Label>
            <Select
              value={formData.content_pillar_id}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, content_pillar_id: value }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select content pillar" />
              </SelectTrigger>
              <SelectContent 
                className="max-h-[200px] overflow-y-auto" 
                position="popper" 
                sideOffset={4}
                style={{ zIndex: 999999 }}
              >
                {contentPillars.length > 0 ? (
                  contentPillars.map((pillar) => (
                    <SelectItem key={pillar.id} value={pillar.id}>
                      <div className="flex items-center gap-2">
                        {pillar.color && (
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: pillar.color }}
                          />
                        )}
                        {pillar.name}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-content-pillars" disabled>
                    No content pillars available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label htmlFor="contentType">Content Type</Label>
            <Select
              value={formData.content_type_id}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, content_type_id: value }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent 
                className="max-h-[200px] overflow-y-auto" 
                position="popper" 
                sideOffset={4}
                style={{ zIndex: 999999 }}
              >
                {contentTypes.length > 0 ? (
                  contentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-content-types" disabled>
                    No content types available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* PIC (Auto-filled, read-only) */}
          <div className="space-y-2">
            <Label htmlFor="pic">PIC</Label>
            <Input
              id="pic"
              value={currentEmployee?.full_name || 'Loading...'}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!loading) {
                  onOpenChange(false);
                }
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !currentEmployee}>
              {loading ? 'Creating...' : 'Create Content Plan'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};