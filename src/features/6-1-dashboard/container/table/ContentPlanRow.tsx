import React, { memo, useState, useRef, useEffect } from 'react';
import { Checkbox } from '@/features/ui/checkbox';
import { Input } from '@/features/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Switch } from '@/features/ui/switch';
import { Button } from '@/features/ui/button';
import { Lock, User } from 'lucide-react';
import { ContentPlan, ContentType, Service, SubService, ContentPillar } from '../../types/social-media';
import { BriefPreview } from './BriefPreview';
import { RevisionCounter } from './RevisionCounter';
import { PostDateCell } from './cells/PostDateCell';
import { PICCell } from './cells/PICCell';
import { GoogleDriveLinkCell, PostLinkCell } from './cells/LinkCells';
import { validateRequiredFields } from './cells/ValidationHelper';
import GoogleDriveLinkDialog from '../../modal/GoogleDriveLinkDialog';
import SocialMediaLinksDialog from '../../modal/SocialMediaLinksDialog';
import BriefDialog from '../../modal/BriefDialog';
import { useDigitalMarketingEmployees } from '../../hook/useDigitalMarketingEmployees';
import { useCreativeEmployees } from '../../hook/useCreativeEmployees';
import { useCurrentUserRole } from '../../hook/useCurrentUserRole';
import { useToast } from '@/features/1-login/hooks/use-toast';
import { useSocialMediaLinks } from '@/features/6-1-dashboard/hook/useSocialMediaLinks';
import { supabase } from '@/integrations/supabase/client';
import { devLog, logger } from '@/config/logger';
import { CreateTaskDialog } from '@/features/8-2-DailyTask/section/CreateTaskDialog';
import { DailyTaskProvider } from '@/features/8-2-DailyTask/DailyTaskContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// Simple in-memory cache for approval/revision checks to avoid repeated DB queries
const approvalCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

interface ApprovalAccess {
  approved: boolean;
  prodApproved: boolean;
  loading: boolean;
}

interface ContentPlanRowProps {
  plan: ContentPlan;
  contentTypes: ContentType[];
  services: Service[];
  subServices: SubService[];
  contentPillars: ContentPillar[];
  selectedItems: string[];
  onSelectItem: (id: string, checked: boolean) => void;
  onFieldChange: (id: string, field: string, value: any) => void | Promise<void>;
  onOpenBriefDialog: (id: string, brief: string | null) => void;
  onOpenTitleDialog: (id: string, title: string | null, approved?: boolean) => void;
  onStatusChange: (id: string, value: string) => void;
  onProductionStatusChange: (id: string, value: string | null) => void;
  onStatusContentChange: (id: string, value: string) => void;
  onResetRevision: (id: string, field: 'revision_count' | 'production_revision_count') => void;
  onOpenLink: (url: string) => void;
  getFilteredSubServices: (serviceId: string | null) => SubService[];
  formatDateTime: (date: string | Date) => string;
  formatDateOnly: (date: string | Date) => string;
  approvalAccess?: ApprovalAccess; // Batch-checked approval access from parent
}
export const ContentPlanRow = memo<ContentPlanRowProps>(({
  plan,
  contentTypes,
  services,
  subServices,
  contentPillars,
  selectedItems,
  onSelectItem,
  onFieldChange,
  onOpenBriefDialog,
  onOpenTitleDialog,
  onStatusChange,
  onProductionStatusChange,
  onStatusContentChange,
  onResetRevision,
  onOpenLink,
  getFilteredSubServices,
  formatDateTime,
  formatDateOnly,
  approvalAccess
}) => {
  const {
    data: digitalEmployees = []
  } = useDigitalMarketingEmployees();
  const {
    data: creativeEmployees = []
  } = useCreativeEmployees();
  const [isGoogleDriveDialogOpen, setIsGoogleDriveDialogOpen] = useState(false);
  const [isSocialLinksDialogOpen, setIsSocialLinksDialogOpen] = useState(false);
  const [isBriefDialogOpen, setIsBriefDialogOpen] = useState(false);
  const [showApprovalOptions, setShowApprovalOptions] = useState({
    status: true,
    production_status: true
  });
  // Fallback Create Task for Branding Plan task existence
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createPrefillTitle, setCreatePrefillTitle] = useState('');
  const [createTriggeredOnce, setCreateTriggeredOnce] = useState(false);
  // Initialize to false to prevent refresh icons showing before config check completes
  const [revisionConfigActive, setRevisionConfigActive] = useState(false);
  const [productionRevisionConfigActive, setProductionRevisionConfigActive] = useState(false);
  const [canApproveProduction, setCanApproveProduction] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const {
    toast
  } = useToast();
  const {
    links
  } = useSocialMediaLinks(plan.id);

  // Helpers for Branding Plan auto-create when approved toggled ON
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const getServiceName = () => {
    const name = (plan as any)?.service?.name || services.find(s => s.id === plan.service_id)?.name || '';
    return name;
  };
  const maybeOpenBrandingPlanCreate = async () => {
    if (createTriggeredOnce) return;
    try {
      const serviceName = getServiceName();
      if (!serviceName || !plan.post_date || !(plan as any).organization_id) return;
      const d = new Date(plan.post_date);
      if (isNaN(d.getTime())) return;

      // IMPORTANT: Jangan bergantung pada due_date karena bisa NULL.
      // Ambil task berdasarkan organization saja, dan batasi via judul 'branding plan' untuk efisiensi,
      // lalu filter di klien berdasarkan service dan bulan Indonesia.
      const { data: tasks, error } = await supabase
        .from('daily_tasks')
        .select('id, title')
        .eq('organization_id', (plan as any).organization_id)
        .ilike('title', '%branding plan%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching monthly daily_tasks:', error);
        return;
      }

      const monthTextID = format(d, 'MMMM yyyy', { locale: idLocale }).toLowerCase();
      const hasBrandingTask = (tasks || []).some(t => {
        const title = normalize(t.title || '');
        return title.includes('branding plan') && title.includes(normalize(serviceName)) && title.includes(monthTextID);
      });

      if (!hasBrandingTask) {
        setCreatePrefillTitle(`${serviceName} - Branding Plan ${format(d, 'MMMM yyyy', { locale: idLocale })}`);
        setIsCreateTaskOpen(true);
        setCreateTriggeredOnce(true);
      }
    } catch (e) {
      console.error('maybeOpenBrandingPlanCreate error:', e);
    }
  };

  // Recheck existence when CreateTaskDialog closed; if masih belum ada, rollback approved
  const recheckOrRollbackAfterCreateClose = async () => {
    try {
      const serviceName = getServiceName();
      if (!serviceName || !plan.post_date || !(plan as any).organization_id) return;
      const d = new Date(plan.post_date);
      if (isNaN(d.getTime())) return;

      const { data: tasks, error } = await supabase
        .from('daily_tasks')
        .select('id, title')
        .eq('organization_id', (plan as any).organization_id)
        .ilike('title', '%branding plan%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error rechecking daily_tasks:', error);
        return;
      }

      const monthTextID = format(d, 'MMMM yyyy', { locale: idLocale }).toLowerCase();
      const exists = (tasks || []).some(t => {
        const title = normalize(t.title || '');
        return title.includes('branding plan') && title.includes(normalize(serviceName)) && title.includes(monthTextID);
      });

      if (!exists) {
        // Rollback approved, completion_date, and status to Need Review
        setApprovedInstant(false); // visual rollback instantly
        onFieldChange(plan.id, 'approved', false);
        onFieldChange(plan.id, 'completion_date', null);
        if (plan.status === 'Approved') {
          onStatusChange(plan.id, 'Need Review');
        }
        // Allow triggering again next time
        setCreateTriggeredOnce(false);
      }
    } catch (e) {
      console.error('recheckOrRollbackAfterCreateClose error:', e);
    }
  };
  // Use batch-checked approval access from parent if available, otherwise fallback to individual checks
  React.useEffect(() => {
    const checkApprovalVisibility = async () => {
      try {
        let statusAccess: boolean;
        let prodApprovalAccess: boolean;

        if (approvalAccess && !approvalAccess.loading) {
          // Use batch-checked approval access from parent (optimized)
          statusAccess = approvalAccess.approved;
          prodApprovalAccess = approvalAccess.prodApproved;
        } else {
          // Fallback to individual checks if approvalAccess not provided or still loading
          statusAccess = await checkAnyUserHasApprovalAccess('approved');
          prodApprovalAccess = await checkAnyUserHasApprovalAccess('prod_approved');
        }

        setShowApprovalOptions({
          status: statusAccess,
          production_status: prodApprovalAccess
        });
        setCanApproveProduction(prodApprovalAccess);

        // Check revision access based on roles and exceptions (cached)
        const revisionAccess = await checkRevisionAccess();
        setRevisionConfigActive(revisionAccess);

        // Check production revision access based on roles and exceptions (cached)
        const productionRevisionAccess = await checkProductionRevisionAccess();
        setProductionRevisionConfigActive(productionRevisionAccess);
        
        setConfigLoaded(true);
      } catch (error) {
        console.error('Error checking approval visibility:', error);
        // On error, keep refresh icons hidden
        setRevisionConfigActive(false);
        setProductionRevisionConfigActive(false);
        setConfigLoaded(true);
      }
    };
    checkApprovalVisibility();
  }, [approvalAccess]);

  // Get current user role
  const { data: currentUserRole } = useCurrentUserRole();
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';

  // Fast approval access using batched result from parent (no awaits for instant UX)
  const checkApprovalAccess = (columnType: string): boolean => {
    if (columnType === 'approved') return !!approvalAccess?.approved;
    if (columnType === 'prod_approved') return !!approvalAccess?.prodApproved;
    return false;
  };

  // Function to check if CURRENT user has approval access for a column type
  const checkAnyUserHasApprovalAccess = async (columnType: string) => {
    // This function should check if the CURRENT user has access, not if ANY user has access
    return await checkApprovalAccess(columnType);
  };

  // Function to check if current user has revision access based on roles and exceptions (with caching)
  const checkRevisionAccess = async () => {
    try {
      // Get current user
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Get user's active organization
      const {
        data: profile,
        error: profileError
      } = await supabase.from('profiles').select('active_organization_id').eq('user_id', user.id).single();
      if (profileError || !profile?.active_organization_id) {
        console.error('Error fetching user profile:', profileError);
        return false;
      }

      // Check cache first
      const cacheKey = `revision_${user.id}_${profile.active_organization_id}`;
      const cached = approvalCheckCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        // Cache hit - return without logging
        return cached.result;
      }

      // Get user's role in the organization
      const {
        data: userRole,
        error: roleError
      } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('organization_id', profile.active_organization_id).single();
      if (roleError || !userRole) {
        console.error('Error fetching user role:', roleError);
        return false;
      }

      // Get user's employee record to check exceptions
      const {
        data: employee,
        error: employeeError
      } = await supabase.from('employees').select('id').eq('user_id', user.id).eq('organization_id', profile.active_organization_id).single();
      if (employeeError || !employee) {
        console.error('Error fetching employee:', employeeError);
        return false;
      }

      // First check if ANY revision configuration exists (regardless of is_active)
      const {
        data: anyConfig,
        error: anyConfigError
      } = await supabase.from('approval_access_configurations').select('is_active').eq('organization_id', profile.active_organization_id).eq('column_type', 'revision').maybeSingle();

      // If any configuration exists but is inactive, hide refresh icon
      if (anyConfig && !anyConfig.is_active) {
        const result = false;
        approvalCheckCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Get revision configuration for the organization (only active ones)
      const {
        data: config,
        error: configError
      } = await supabase.from('approval_access_configurations').select('*').eq('organization_id', profile.active_organization_id).eq('column_type', 'revision').eq('is_active', true).maybeSingle();
      if (configError || !config) {
        const result = userRole.role === 'owner' || userRole.role === 'admin';
        approvalCheckCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Check if user's role is in the allowed roles
      const hasRoleAccess = config.allowed_roles?.includes(userRole.role);

      // Check if user is in the exceptions list
      const isException = config.exceptions?.includes(employee.id);
      const result = hasRoleAccess || isException;
      
      // Cache the result
      approvalCheckCache.set(cacheKey, { result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error('Error checking revision access:', error);
      return false;
    }
  };

  // Function to check if current user has production revision access based on roles and exceptions (with caching)
  const checkProductionRevisionAccess = async () => {
    try {
      // Get current user
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Get user's active organization
      const {
        data: profile,
        error: profileError
      } = await supabase.from('profiles').select('active_organization_id').eq('user_id', user.id).single();
      if (profileError || !profile?.active_organization_id) {
        console.error('Error fetching user profile:', profileError);
        return false;
      }

      // Check cache first
      const cacheKey = `production_revision_${user.id}_${profile.active_organization_id}`;
      const cached = approvalCheckCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        // Cache hit - return without logging
        return cached.result;
      }

      // Get user's role in the organization
      const {
        data: userRole,
        error: roleError
      } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('organization_id', profile.active_organization_id).single();
      if (roleError || !userRole) {
        console.error('Error fetching user role:', roleError);
        return false;
      }

      // Get user's employee record to check exceptions
      const {
        data: employee,
        error: employeeError
      } = await supabase.from('employees').select('id').eq('user_id', user.id).eq('organization_id', profile.active_organization_id).single();
      if (employeeError || !employee) {
        console.error('Error fetching employee:', employeeError);
        return false;
      }

      // First check if ANY production revision configuration exists (regardless of is_active)
      const {
        data: anyConfig,
        error: anyConfigError
      } = await supabase.from('approval_access_configurations').select('is_active').eq('organization_id', profile.active_organization_id).eq('column_type', 'production_revision').maybeSingle();

      // If any configuration exists but is inactive, hide refresh icon
      if (anyConfig && !anyConfig.is_active) {
        const result = false;
        approvalCheckCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Get production revision configuration for the organization (only active ones)
      const {
        data: config,
        error: configError
      } = await supabase.from('approval_access_configurations').select('*').eq('organization_id', profile.active_organization_id).eq('column_type', 'production_revision').eq('is_active', true).maybeSingle();
      if (configError || !config) {
        const result = userRole.role === 'owner' || userRole.role === 'admin';
        approvalCheckCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }

      // Check if user's role is in the allowed roles
      const hasRoleAccess = config.allowed_roles?.includes(userRole.role);

      // Check if user is in the exceptions list
      const isException = config.exceptions?.includes(employee.id);
      const result = hasRoleAccess || isException;
      
      // Cache the result
      approvalCheckCache.set(cacheKey, { result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error('Error checking production revision access:', error);
      return false;
    }
  };

  // Remove job position filtering for PIC (column 3) - use all digital employees
  const picEmployees = digitalEmployees;

  // Find selected PIC employee name
  const selectedPIC = digitalEmployees.find(emp => emp.id === plan.pic_id);

  // For PIC Production, use the data from the database relation first, then fallback to digitalEmployees
  const selectedProductionPIC = plan.pic_production?.full_name ? {
    full_name: plan.pic_production.full_name,
    id: plan.pic_production.id
  } : digitalEmployees.find(emp => emp.id === plan.pic_production_id);
  
  // Only log if there's a mismatch (pic_production_id exists but employee not found)
  if (plan.pic_production_id && !selectedProductionPIC) {
    logger.rateLimited(`pic-production-missing:${plan.id}`, 5000, () => {
      devLog.debug('⚠️ PIC Production employee not found:', {
        plan_id: plan.id,
        pic_production_id: plan.pic_production_id,
        digitalEmployeesCount: digitalEmployees?.length || 0
      });
    });
  }

  // Get content type name for display
  const contentTypeName = contentTypes.find(type => type.id === plan.content_type_id)?.name || '';
  

  // POINT 4: Content fields are no longer locked when approved
  // const isContentLocked = plan.approved === true; // REMOVED: No more locking

  // POINT 3: Production fields are no longer locked when production approved
  // const isProductionLocked = plan.production_approved === true; // REMOVED: No more production locking

  // Track the last post_date values to detect changes
  const calculateOnTimeStatus = (actualPostDate: string | null, postDate: string) => {
    if (!actualPostDate || !postDate) return '';
    
    try {
      const actual = new Date(actualPostDate);
      const planned = new Date(postDate);
      
      // Check if dates are valid
      if (isNaN(actual.getTime()) || isNaN(planned.getTime())) {
        return '';
      }
      
      // Calculate difference in days
      const diffTime = actual.getTime() - planned.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        return 'Ontime';
      } else {
        return `Late ${diffDays} Day${diffDays > 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error calculating on-time status:', error);
      return '';
    }
  };

  // Calculate on-time status for display
  const displayOnTimeStatus = () => {
    if (!plan.post_date) {
      return '';
    }

    // Prefer using stored on_time_status from database when available
    if (plan.on_time_status && plan.on_time_status.trim().length > 0) {
      return plan.on_time_status;
    }

    // Fallback: compute using actual_post_date value
    return calculateOnTimeStatus(plan.actual_post_date, plan.post_date);
  };

  // Calculate actual post date for display
  const displayActualPostDate = () => {
    // If there are links, show current date
    return plan.actual_post_date ? formatDateOnly(plan.actual_post_date) : '-';
  };
  const handleCheckboxChange = (checked: boolean) => {
    onSelectItem(plan.id, checked);
  };

  // Check if PIC field should be locked (auto-populated from Add Content or Post Link)
  const isPICLocked = plan.pic_id !== null && plan.pic_id !== undefined && plan.pic_id !== '';

  // Check if PIC Production field should be locked (auto-populated from Google Drive Link)
  const isPICProductionLocked = plan.pic_production_id !== null && plan.pic_production_id !== undefined && plan.pic_production_id !== '';

  // Check if Google Drive Link should be disabled (when Approved is false)
  const isGoogleDriveLinkDisabled = !plan.approved;

  // Check if Post Link should be disabled (when Production Approved is false)
  const isPostLinkDisabled = !plan.production_approved;

  // UPDATED: Handle Google Drive Link change with auto-save and production status logic
  const handleGoogleDriveLinkChange = (value: string) => {
    // Normalize: Convert empty string to null for consistency
    const normalizedValue = value && value.trim().length > 0 ? value : null;
    
    if (normalizedValue) {
      // If link is being added, trigger the existing auto-assignment logic and set production status to "Need Review"
      onFieldChange(plan.id, 'google_drive_link', normalizedValue);
      onProductionStatusChange(plan.id, 'Need Review');
    } else {
      // If link is being cleared, also clear PIC Production and set production status to null
      // Standardize: Save as null instead of empty string for consistency
      onFieldChange(plan.id, 'google_drive_link', null);
      onFieldChange(plan.id, 'pic_production_id', null);
      onProductionStatusChange(plan.id, null); // Also standardize to null
    }
  };

  // POINT 2: Handle Approved change - check approval access configuration
  // Local visual state to make unapprove instant without waiting server
  const [approvedInstant, setApprovedInstant] = useState<boolean | null>(null);
  // Sinkronkan kembali ke nilai dari server setelah update datang
  useEffect(() => {
    // Setelah plan.approved berubah (hasil server/realtime), serahkan kontrol ke data server
    setApprovedInstant(null);
  }, [plan.approved]);

  const handleApprovedChange = async (checked: boolean) => {
    // Check if user has approval access based on pre-fetched configuration
    const hasApprovalAccess = checkApprovalAccess('approved');
    if (!hasApprovalAccess) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to approve this content"
      });
      return;
    }
    if (checked) {
      // Selalu biarkan toggle tetap OFF; parent akan membuka modal Select Daily Task via requestApproval
      // Validasi field wajib
      const missingFields = validateRequiredFields(plan);
      if (missingFields.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot approve content",
          description: `Please fill in the following required fields: ${missingFields.join(', ')}`
        });
        return;
      }
      // Jangan ubah visual ON, cukup minta parent update field 'approved' → parent akan intercept dan buka modal
      onFieldChange(plan.id, 'approved', true);
      return;
    } else {
      // Make unapprove visual instant
      setApprovedInstant(false);
      // When unapproved, clear completion_date and change status to "Need Review"
      onFieldChange(plan.id, 'completion_date', null);
      // If current status is "Approved", change it to "Need Review"
      if (plan.status === 'Approved') {
        onStatusChange(plan.id, 'Need Review');
      }
      // Update approved flag to false
      onFieldChange(plan.id, 'approved', false);
      // Reset one-shot flag so future approvals can trigger check again
      setCreateTriggeredOnce(false);
    }
  };

  // POINT 3: Handle Production Approved change - OPTIMIZED: Batch updates and prevent double-clicks
  const [isUpdatingProductionApproved, setIsUpdatingProductionApproved] = useState(false);
  
  const handleProductionApprovedChange = async (checked: boolean) => {
    // Prevent double-clicks and concurrent updates
    if (isUpdatingProductionApproved) {
      return;
    }

    // Quick access check using cached value first (non-blocking for better UX)
    // Use canApproveProduction which is already checked on mount
    if (!canApproveProduction) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to approve production"
      });
      return;
    }

    setIsUpdatingProductionApproved(true);
    
    try {
      // Double-check access (async but should be fast due to caching)
      const hasApprovalAccess = await checkApprovalAccess('prod_approved');
      if (!hasApprovalAccess) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to approve production"
        });
        setIsUpdatingProductionApproved(false);
        return;
      }

      // Validate: Cannot set production_approved to true if google_drive_link is NULL or EMPTY
      if (checked) {
        const googleDriveLink = plan.google_drive_link;
        if (!googleDriveLink || googleDriveLink.trim() === '') {
          toast({
            variant: "destructive",
            title: "Cannot Approve Production",
            description: "Please provide a Google Drive link before approving production. The Google Drive link is required for production approval."
          });
          setIsUpdatingProductionApproved(false);
          return;
        }
      }

      // Prepare all updates in a single batch
      const batchUpdates: any = {
        production_approved: checked
      };

      if (checked) {
        // When production approved is checked, automatically set production status to "Approved"
        // and set the approved date
        const approvedDate = new Date().toISOString();
        batchUpdates.production_status = 'Approved';
        batchUpdates.production_approved_date = approvedDate;
      } else {
        // When production approved is unchecked, clear the approved date
        batchUpdates.production_approved_date = null;
        // If current production status is "Approved", change it to "Need Review"
        if (plan.production_status === 'Approved') {
          batchUpdates.production_status = 'Need Review';
        }
      }

      // OPTIMIZED: Single update call with all fields batched
      // This reduces database roundtrips and trigger executions
      // The batch update in handleFieldChange will collect these and send as one mutation
      onFieldChange(plan.id, 'production_approved', checked);
      
      // Update related fields - these will be batched together by handleFieldChange
      if (batchUpdates.production_status) {
        onProductionStatusChange(plan.id, batchUpdates.production_status);
      }
      if (batchUpdates.production_approved_date !== undefined) {
        onFieldChange(plan.id, 'production_approved_date', batchUpdates.production_approved_date);
      }
    } catch (error) {
      console.error('Error updating production approved:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update production approved status"
      });
    } finally {
      // Reset loading state quickly for better UX
      setTimeout(() => {
        setIsUpdatingProductionApproved(false);
      }, 150);
    }
  };
  const handleGoogleDriveLinkClick = () => {
    if (!plan.approved) return; // Don't open if not approved
    setIsGoogleDriveDialogOpen(true);
  };
  const handleSocialLinksClick = () => {
    if (!plan.production_approved) return; // Don't open if production not approved
    setIsSocialLinksDialogOpen(true);
  };

  // UPDATED: Google Drive Link save handler with auto production status logic
  const handleGoogleDriveLinkSave = (link: string) => {
    handleGoogleDriveLinkChange(link);
  };

  // Handle status updates from BriefDialog - REAL-TIME UPDATE
  const handleBriefStatusUpdate = (planId: string, updates: any) => {
    devLog.debug('Brief status update - applying real-time:', {
      planId,
      updates
    });

    // Apply updates immediately using the existing onFieldChange callback
    Object.entries(updates).forEach(([field, value]) => {
      onFieldChange(planId, field, value);
    });
  };

  // Handle Brief Dialog
  const handleBriefClick = () => {
    // REMOVED: No more content locking
    setIsBriefDialogOpen(true);
  };
  const handleBriefSave = (brief: string) => {
    onFieldChange(plan.id, 'brief', brief);
    setIsBriefDialogOpen(false);
  };
  
  // Only log PIC checks if there's a mismatch (pic_id exists but employee not found)
  if (plan.pic_id && !selectedPIC) {
    logger.rateLimited(`pic-missing:${plan.id}`, 5000, () => {
      devLog.debug('⚠️ PIC employee not found:', {
        plan_id: plan.id,
        pic_id: plan.pic_id
      });
    });
  }
  return <>
      <tr className="hover:bg-gray-50">
        {/* Checkbox */}
        <td style={{
        width: '48px',
        minWidth: '48px',
        maxWidth: '48px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <Checkbox checked={selectedItems.includes(plan.id)} onCheckedChange={handleCheckboxChange} />
        </td>

        {/* POINT 4: Post Date - No longer locked when approved */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <PostDateCell postDate={plan.post_date} onDateChange={date => onFieldChange(plan.id, 'post_date', date)} />
        </td>

        {/* PIC */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <PICCell picId={plan.pic_id} isPICLocked={isPICLocked} employees={picEmployees} selectedPIC={selectedPIC} onPICChange={value => onFieldChange(plan.id, 'pic_id', value)} />
        </td>

        {/* POINT 4: Content Type - No longer locked when approved */}
        <td style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <Select value={plan.content_type_id || 'placeholder'} onValueChange={value => {
          if (value === 'placeholder') return;
          onFieldChange(plan.id, 'content_type_id', value);
        }}>
              <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Select Type</SelectItem>
                {contentTypes.map(type => <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
        </td>

        {/* POINT 4: Service - No longer locked when approved */}
        <td style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <Select value={plan.service_id || 'placeholder'} onValueChange={value => {
          if (value === 'placeholder') return;
          onFieldChange(plan.id, 'service_id', value);
          onFieldChange(plan.id, 'sub_service_id', null);
        }}>
              <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Select Service</SelectItem>
                {services.map(service => <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
        </td>

        {/* POINT 4: Sub Service - No longer locked when approved */}
        <td style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <Select value={plan.sub_service_id || 'placeholder'} onValueChange={value => {
          if (value === 'placeholder') return;
          onFieldChange(plan.id, 'sub_service_id', value);
        }} disabled={!plan.service_id}>
              <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Select Sub Service</SelectItem>
                {(getFilteredSubServices ? getFilteredSubServices(plan.service_id) : subServices.filter(sub => sub.service_id === plan.service_id)).map(subService => <SelectItem key={subService.id} value={subService.id}>
                    {subService.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
        </td>

        {/* POINT 4: Title - No longer locked when approved */}
        <td style={{
        width: '280px',
        minWidth: '280px',
        maxWidth: '280px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <Button variant="ghost" className="h-8 w-full justify-start text-xs px-2 border border-gray-200 hover:bg-gray-50" onClick={() => onOpenTitleDialog(plan.id, plan.title, plan.approved)}>
              <span className="truncate block w-full text-left">
                {plan.title || 'Click to add title...'}
              </span>
            </Button>
        </td>

        {/* POINT 4: Content Pillar - No longer locked when approved */}
        <td style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <Select value={plan.content_pillar_id || 'placeholder'} onValueChange={value => {
          if (value === 'placeholder') return;
          onFieldChange(plan.id, 'content_pillar_id', value);
        }}>
              <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>Select Pillar</SelectItem>
                {contentPillars.map(pillar => <SelectItem key={pillar.id} value={pillar.id}>
                    {pillar.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
        </td>

        {/* POINT 4: Brief - No longer locked when approved */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <BriefPreview brief={plan.brief} onClick={handleBriefClick} />
        </td>

        {/* POINT 4: Status - No longer locked when approved */}
        <td style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <Select value={plan.status || 'none'} onValueChange={value => {
          if (value === 'none') {
            onStatusChange(plan.id, '');
          } else {
            onStatusChange(plan.id, value);
          }
        }}>
              <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Status</SelectItem>
                <SelectItem value="Need Review">Need Review</SelectItem>
                {showApprovalOptions.status && <>
                    <SelectItem value="Request Revision">Request Revision</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                  </>}
              </SelectContent>
            </Select>
        </td>

        {/* POINT 4: Revision Count - No longer locked when approved */}
        <td style={{
        width: '96px',
        minWidth: '96px',
        maxWidth: '96px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <RevisionCounter count={plan.revision_count || 0} onReset={() => onResetRevision(plan.id, 'revision_count')} showResetButton={configLoaded && revisionConfigActive} />
        </td>

        {/* POINT 2: Approved - Check approval access configuration */}
        <td style={{
        width: '120px',
        minWidth: '120px',
        maxWidth: '120px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <Switch checked={approvedInstant ?? (plan.approved || false)} onCheckedChange={handleApprovedChange} />
        </td>

        {/* Completion Date - Center aligned */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <span className="text-xs text-gray-600">
            {plan.completion_date ? formatDateTime(plan.completion_date) : '-'}
          </span>
        </td>

        {/* PIC Production - Auto-populated only (no dropdown) */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          {selectedProductionPIC?.full_name ? <div className="flex items-center gap-2 h-8 px-3 bg-blue-50 border border-blue-200 rounded-sm text-xs">
              <User className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-blue-700">
                {selectedProductionPIC.full_name}
              </span>
            </div> : <div className="h-8 px-3 bg-gray-100 border border-gray-200 rounded-sm text-xs flex items-center justify-center text-gray-500">
              Auto-populated
            </div>}
        </td>

        {/* POINT 3: Google Drive Link - No longer locked when production approved */}
        <td style={{
        width: '280px',
        minWidth: '280px',
        maxWidth: '280px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <GoogleDriveLinkCell googleDriveLink={plan.google_drive_link} isDisabled={isGoogleDriveLinkDisabled} onClick={() => {
          if (!plan.approved) return; // Don't open if not approved
          setIsGoogleDriveDialogOpen(true);
        }} />
        </td>

        {/* POINT 3: Production Status - No longer locked when production approved */}
        <td style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <Select value={plan.production_status || 'none'} onValueChange={value => {
          if (value === 'none') {
            // Standardize: Save as null instead of empty string for consistency
            onProductionStatusChange(plan.id, null);
          } else {
            onProductionStatusChange(plan.id, value);
          }
        }}>
              <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
                <SelectValue placeholder="No Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Status</SelectItem>
                <SelectItem value="Need Review">Need Review</SelectItem>
                {showApprovalOptions.production_status && <>
                    <SelectItem value="Request Revision">Request Revision</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                  </>}
              </SelectContent>
            </Select>
        </td>

        {/* POINT 3: Production Revision Count - No longer locked when production approved */}
        <td style={{
        width: '96px',
        minWidth: '96px',
        maxWidth: '96px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <RevisionCounter count={plan.production_revision_count || 0} onReset={() => onResetRevision(plan.id, 'production_revision_count')} showResetButton={configLoaded && productionRevisionConfigActive} />
        </td>

        {/* POINT 3: Production Approved - Check approval access configuration */}
        <td style={{
        width: '120px',
        minWidth: '120px',
        maxWidth: '120px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <Switch 
            checked={plan.production_approved || false} 
            onCheckedChange={handleProductionApprovedChange} 
            disabled={!canApproveProduction || isUpdatingProductionApproved}
          />
          {!canApproveProduction}
        </td>

        {/* Production Completion Date - Center aligned */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <span className="text-xs text-gray-600">
            {plan.production_completion_date ? formatDateTime(plan.production_completion_date) : '-'}
          </span>
        </td>

        {/* POINT 1: Production Approved Date - Center aligned, shows real-time data, FIXED clearing logic */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <span className="text-xs text-gray-600">
            {plan.production_approved_date ? formatDateTime(plan.production_approved_date) : '-'}
          </span>
        </td>

        {/* Post Link - Social media links dialog using table data */}
        <td style={{
        width: '280px',
        minWidth: '280px',
        maxWidth: '280px'
      }} className="px-2 py-1 border-r border-gray-200 border-b border-gray-200">
          <PostLinkCell planId={plan.id} isDisabled={isPostLinkDisabled} onSocialLinksClick={() => {
          if (!plan.production_approved) return; // Don't open if production not approved
          setIsSocialLinksDialogOpen(true);
        }} />
        </td>

        {/* PIC POST - Show employee who added first link */}
        <td style={{
        width: '180px',
        minWidth: '180px',
        maxWidth: '180px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <span className="text-xs text-gray-600">
            {plan.post_link_creator?.full_name || '-'}
          </span>
        </td>

        {/* Done - Auto-controlled by Social Media Links */}
        <td style={{
        width: '64px',
        minWidth: '64px',
        maxWidth: '64px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <Switch checked={links && links.length > 0} onCheckedChange={() => {}} // Read-only, controlled by links existence
        disabled={true} />
        </td>

        {/* Actual Post Date - Show actual post date when links exist */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <span className="text-xs text-gray-600">
            {displayActualPostDate()}
          </span>
        </td>

        {/* On Time Status - FIXED: Calculate and display real-time status */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 text-center border-r border-gray-200 border-b border-gray-200">
          <span className={`text-xs font-medium ${displayOnTimeStatus().includes('Late') ? 'text-red-600' : displayOnTimeStatus() === 'Ontime' ? 'text-green-600' : 'text-gray-600'}`}>
            {displayOnTimeStatus() || '-'}
          </span>
        </td>

        {/* Status Content - Now with dropdown */}
        <td style={{
        width: '160px',
        minWidth: '160px',
        maxWidth: '160px'
      }} className="px-2 py-1 border-b border-gray-200">
          <Select value={plan.status_content || 'none'} onValueChange={value => onStatusContentChange(plan.id, value)}>
            <SelectTrigger className="h-8 text-xs border-gray-200 text-left">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Status</SelectItem>
              <SelectItem value="Cancel">Cancel</SelectItem>
              <SelectItem value="Recomended For Ads">Recomended For Ads</SelectItem>
            </SelectContent>
          </Select>
        </td>
      </tr>

      {/* POINT 3: Google Drive Link Dialog - Pass sync handlers for production approval */}
      <GoogleDriveLinkDialog isOpen={isGoogleDriveDialogOpen} onClose={() => setIsGoogleDriveDialogOpen(false)} googleDriveLink={plan.google_drive_link || ''} productionApproved={plan.production_approved || false} onSave={link => {
        // Normalize: Convert empty string to null for consistency
        const normalizedLink = link && link.trim().length > 0 ? link : null;
        devLog.debug('📝 GoogleDriveLinkDialog onSave called:', {
          planId: plan.id,
          link: normalizedLink
        });
        // Always call onFieldChange for google_drive_link - this will trigger auto-populate/clear logic in SocialMedia.tsx
        // handleFieldChange in SocialMedia.tsx will handle clearing pic_production_id, production_completion_date, and production_status
        // Use normalizedLink to ensure consistency (null instead of empty string)
        onFieldChange(plan.id, 'google_drive_link', normalizedLink);
        if (normalizedLink) {
          // Set production status to Need Review when link is added (only if link is not empty)
          onProductionStatusChange(plan.id, 'Need Review');
        } else {
          // Clear production status when link is removed or empty
          // handleFieldChange in SocialMediaDashboardPage will handle resetting production_status to null
          // This ensures production_status is not "Need Review" when google_drive_link is empty
          onProductionStatusChange(plan.id, null);
        }
    }} socialMediaPlanId={plan.id} planTitle={plan.title} contentTitle={plan.title} contentType={contentTypeName} postDate={plan.post_date}
    // POINT 3: Add handlers for production approval sync
    onApprove={() => {
      const approvedDate = new Date().toISOString();
      onFieldChange(plan.id, 'production_approved', true);
      onFieldChange(plan.id, 'production_approved_date', approvedDate);
      onProductionStatusChange(plan.id, 'Approved');
    }} onRevision={() => {
      // onProductionStatusChange already handles all required fields when value is "Request Revision":
      // - production_status: 'Request Revision'
      // - production_revision_count: incremented
      // - production_completion_date: null
      // - production_approved: false
      // - production_approved_date: null
      // So we just need to call it once
      console.log('🔄 onRevision callback called for plan:', plan.id, {
        currentStatus: plan.production_status,
        currentApproved: plan.production_approved
      });
      onProductionStatusChange(plan.id, 'Request Revision');
      console.log('✅ onProductionStatusChange called with "Request Revision"');
    }} />

      {/* Social Media Links Dialog */}
      <SocialMediaLinksDialog isOpen={isSocialLinksDialogOpen} onClose={() => setIsSocialLinksDialogOpen(false)} socialMediaPlanId={plan.id} planTitle={plan.title} />

      {/* Brief Dialog - NOW WITH REAL-TIME STATUS UPDATE */}
      <BriefDialog isOpen={isBriefDialogOpen} onClose={() => setIsBriefDialogOpen(false)} brief={plan.brief} onSave={handleBriefSave} socialMediaPlanId={plan.id} onStatusUpdate={handleBriefStatusUpdate} />

      {/* Auto-create Branding Plan task when approved toggled ON and not exists */}
      <DailyTaskProvider>
        <CreateTaskDialog
          open={isCreateTaskOpen}
          onOpenChange={(open) => {
            setIsCreateTaskOpen(open);
            if (!open) {
              // Immediate visual rollback to reflect cancellation
              setApprovedInstant(false);
              // After dialog closed, recheck existence; rollback toggle if task still not found
              void recheckOrRollbackAfterCreateClose();
            }
          }}
          defaultTitle={createPrefillTitle}
          defaultPlanDate={plan.post_date ? new Date(plan.post_date) : null}
        />
      </DailyTaskProvider>
    </>;
});
ContentPlanRow.displayName = 'ContentPlanRow';