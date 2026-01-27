import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/features/ui/radio-group';
import { Badge } from '@/features/ui/badge';
import { Separator } from '@/features/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/features/ui/form';
import { useKOLCampaignAssignments } from '@/hooks/organized/utils';
import { useKOLPaymentTerms } from '../hooks/useKOLPaymentTerms';
import { usePaymentMilestones } from '@/hooks/organized/utils';
import { CreateContentPostData } from '@/hooks/organized/utils';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useKOLRates } from '@/hooks/organized/utils';
import { DollarSign, Calendar, Target, Handshake, Plus, Trash2, Award, Upload } from 'lucide-react';

interface AddContentPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateContentPostData & {
    paymentTermsData?: any;
  }) => void;
  isLoading?: boolean;
}

const milestoneSchema = z.object({
  milestone_name: z.string().min(1, 'Milestone name is required'),
  payment_percentage: z.number().min(0.01, 'Percentage must be greater than 0').max(100, 'Percentage cannot exceed 100'),
  due_date: z.string().optional(),
  description: z.string().optional(),
  invoice_file: z.any().optional()
});

const performanceThresholdSchema = z.object({
  metric: z.enum(['reach', 'engagement', 'conversion']),
  threshold: z.number().min(1, 'Threshold must be greater than 0'),
  bonus_percentage: z.number().min(0, 'Bonus percentage must be non-negative').max(100, 'Bonus cannot exceed 100%')
});

const contentPostSchema = z.object({
  campaign_assignment_id: z.string().min(1, 'Campaign assignment is required'),
  title: z.string().min(1, 'Title is required'),
  platform: z.string().min(1, 'Platform is required'),
  content_type: z.string().min(1, 'Content type is required'),
  post_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  post_date: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  mentions: z.string().optional(),
  status: z.enum(['draft', 'posted', 'archived']).default('draft'),
  // Simplified Payment Terms Fields
  payment_model: z.enum(['fixed', 'performance_based', 'barter_plus_fee']).default('fixed'),
  base_amount: z.string().min(1, 'Base amount is required'),
  barter_value: z.string().optional(),
  payment_schedule: z.enum(['immediate', 'net_30', 'net_60', 'milestone_based']).default('milestone_based'),
  // Payment Milestones
  milestones: z.array(milestoneSchema).default([]),
  // Performance Thresholds
  performance_thresholds: z.array(performanceThresholdSchema).default([])
}).refine((data) => {
  // Validate total milestone percentage equals 100%
  if (data.milestones.length > 0) {
    const totalPercentage = data.milestones.reduce((sum, m) => sum + m.payment_percentage, 0);
    return Math.abs(totalPercentage - 100) < 0.01; // Allow small floating point differences
  }
  return true;
}, {
  message: "Total milestone percentages must equal 100%",
  path: ["milestones"]
});

type ContentPostFormData = z.infer<typeof contentPostSchema>;

const AddContentPostModal = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false
}: AddContentPostModalProps) => {
  const {
    assignments,
    isLoading: isLoadingAssignments
  } = useKOLCampaignAssignments();
  const {
    createPaymentTerm
  } = useKOLPaymentTerms();
  const {
    createMilestone
  } = usePaymentMilestones();
  const {
    currentOrg
  } = useCurrentOrg();

  const form = useForm<ContentPostFormData>({
    resolver: zodResolver(contentPostSchema),
    defaultValues: {
      campaign_assignment_id: '',
      title: '',
      platform: '',
      content_type: '',
      post_url: '',
      post_date: '',
      caption: '',
      hashtags: '',
      mentions: '',
      status: 'draft',
      payment_model: 'fixed',
      base_amount: '',
      barter_value: '',
      payment_schedule: 'milestone_based',
      milestones: [{
        milestone_name: '',
        payment_percentage: 0,
        due_date: '',
        description: '',
        invoice_file: undefined
      }],
      performance_thresholds: []
    }
  });

  // Field arrays for dynamic milestone and threshold management
  const { 
    fields: milestoneFields, 
    append: appendMilestone, 
    remove: removeMilestone 
  } = useFieldArray({
    control: form.control,
    name: 'milestones'
  });

  const { 
    fields: thresholdFields, 
    append: appendThreshold, 
    remove: removeThreshold 
  } = useFieldArray({
    control: form.control,
    name: 'performance_thresholds'
  });

  // Watch payment model to show conditional fields
  const paymentModel = form.watch('payment_model');
  const selectedAssignmentId = form.watch('campaign_assignment_id');
  const selectedPlatform = form.watch('platform');
  const selectedContentType = form.watch('content_type');
  const baseAmount = form.watch('base_amount');
  const milestones = form.watch('milestones');

  // Get selected assignment details
  const selectedAssignment = useMemo(() => assignments.find(a => a.id === selectedAssignmentId), [assignments, selectedAssignmentId]);

  // Get rates for the selected KOL
  const {
    rates,
    findRate
  } = useKOLRates(selectedAssignment?.kol_profile_id);

  // Auto-populate base amount when campaign, platform, and content type are selected
  useEffect(() => {
    if (selectedAssignment && selectedPlatform && selectedContentType && findRate) {
      const matchingRate = findRate(selectedPlatform, selectedContentType);
      if (matchingRate) {
        const rateAmountString = matchingRate.rate_amount.toString();
        if (form.getValues('base_amount') !== rateAmountString) {
          form.setValue('base_amount', rateAmountString);
        }
      } else {
        if (form.getValues('base_amount') !== '') {
          form.setValue('base_amount', '');
        }
      }
    } else {
      if (form.getValues('base_amount') !== '') {
        form.setValue('base_amount', '');
      }
    }
  }, [selectedAssignment?.id, selectedPlatform, selectedContentType, findRate]);

  // Calculate milestone amounts in IDR
  const calculateMilestoneAmount = (percentage: number) => {
    const baseAmountNum = parseFloat(baseAmount) || 0;
    return (baseAmountNum * percentage) / 100;
  };

  // Calculate total percentage
  const totalPercentage = milestones.reduce((sum, m) => sum + (m.payment_percentage || 0), 0);

  // Form validation
  const isFormValid = useMemo(() => {
    const values = form.getValues();
    const hasRequiredFields = !!(
      values.campaign_assignment_id &&
      values.title &&
      values.platform &&
      values.content_type &&
      values.base_amount
    );
    
    const isMilestoneValid = milestones.length > 0 && 
      Math.abs(totalPercentage - 100) < 0.01 &&
      milestones.every(m => m.milestone_name && m.payment_percentage > 0);
    
    return hasRequiredFields && isMilestoneValid;
  }, [milestones, totalPercentage, form.watch()]);;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSubmit = (data: ContentPostFormData) => {
    console.log('🚀 Form submitted with data:', data);
    
    const selectedAssignment = assignments.find(a => a.id === data.campaign_assignment_id);
    if (!selectedAssignment || !currentOrg?.id) {
      console.error('Missing required data for content post creation');
      return;
    }

    const submitData: CreateContentPostData = {
      campaign_assignment_id: data.campaign_assignment_id,
      title: data.title,
      platform: data.platform,
      content_type: data.content_type,
      post_url: data.post_url || null,
      post_date: data.post_date || null,
      caption: data.caption || null,
      hashtags: data.hashtags ? data.hashtags.split(' ').filter(tag => tag.trim()) : null,
      mentions: data.mentions ? data.mentions.split(' ').filter(mention => mention.trim()) : null,
      status: data.status,
      organization_id: currentOrg.id,
      kol_profile_id: selectedAssignment.kol_profile_id,
      campaign_id: selectedAssignment.campaign_id
    };

    // Create payment terms data with proper milestone structure
    const paymentTermsData = {
      type: 'content_post',
      payment_model: data.payment_model,
      base_amount: parseFloat(data.base_amount),
      barter_value: data.barter_value ? parseFloat(data.barter_value) : null,
      payment_schedule: data.payment_schedule,
      kol_profile_id: selectedAssignment.kol_profile_id,
      milestones: data.milestones.map((m, index) => ({
        milestone_name: m.milestone_name,
        payment_percentage: m.payment_percentage,
        amount: calculateMilestoneAmount(m.payment_percentage),
        due_date: m.due_date || null,
        milestone_description: m.description || null,
        milestone_order: index + 1,
        status: 'pending',
        trigger_condition: 'manual',
        invoice_file: m.invoice_file || null
      })),
      performance_thresholds: data.performance_thresholds
    };

    onSubmit({ ...submitData, paymentTermsData });
  };

  const handleAddMilestone = () => {
    appendMilestone({
      milestone_name: '',
      payment_percentage: 0,
      due_date: '',
      description: '',
      invoice_file: undefined
    });
  };

  const handleAddThreshold = () => {
    appendThreshold({
      metric: 'reach',
      threshold: 0,
      bonus_percentage: 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 pt-6 px-6 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Create Content Post & Payment Agreement
          </DialogTitle>
          <DialogDescription>
            Create a new content post with integrated payment terms and milestones for KOL collaboration.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll px-6 pt-4">
          <Form {...form}>
            <form id="content-post-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-4">
            {/* Basic Content Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="campaign_assignment_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Assignment</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select assignment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assignments.map((assignment) => (
                              <SelectItem key={assignment.id} value={assignment.id}>
                                {assignment.kol_profile?.name} - {assignment.campaign?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter content title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="twitter">Twitter</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="post">Post</SelectItem>
                            <SelectItem value="story">Story</SelectItem>
                            <SelectItem value="reel">Reel</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="posted">Posted</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="post_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="post_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="caption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caption (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter caption" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hashtags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hashtags (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="#hashtag1 #hashtag2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mentions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mentions (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="@username1 @username2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Payment Agreement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="w-5 h-5" />
                  Payment Agreement
                </CardTitle>
                <CardDescription>
                  Set up payment terms and milestones for this content collaboration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Model */}
                <FormField
                  control={form.control}
                  name="payment_model"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">Payment Model</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-3 gap-4"
                        >
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="fixed" id="fixed" />
                            <Label htmlFor="fixed" className="cursor-pointer">
                              <div>
                                <div className="font-medium">Fixed Payment</div>
                                <div className="text-sm text-muted-foreground">Set amount regardless of performance</div>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="performance_based" id="performance" />
                            <Label htmlFor="performance" className="cursor-pointer">
                              <div>
                                <div className="font-medium">Performance-Based</div>
                                <div className="text-sm text-muted-foreground">Payment based on metrics achieved</div>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2 border rounded-lg p-3">
                            <RadioGroupItem value="barter_plus_fee" id="barter" />
                            <Label htmlFor="barter" className="cursor-pointer">
                              <div>
                                <div className="font-medium">Barter + Fee</div>
                                <div className="text-sm text-muted-foreground">Product/service exchange + cash</div>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Base Amount and Barter Value */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="base_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Amount (IDR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {paymentModel === 'barter_plus_fee' && (
                    <FormField
                      control={form.control}
                      name="barter_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barter Value (IDR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Payment Schedule */}
                <FormField
                  control={form.control}
                  name="payment_schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Schedule</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schedule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="net_30">Net 30</SelectItem>
                          <SelectItem value="net_60">Net 60</SelectItem>
                          <SelectItem value="milestone_based">Milestone Based</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Payment Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Payment Milestones
                </CardTitle>
                <CardDescription>
                  Define payment milestones based on percentage of base amount. Total must equal 100%.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Indicator */}
                {milestoneFields.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Total Percentage:</span>
                    <Badge 
                      variant={Math.abs(totalPercentage - 100) < 0.01 ? "default" : "destructive"}
                    >
                      {totalPercentage.toFixed(1)}%
                    </Badge>
                  </div>
                )}

                {milestoneFields.map((field, index) => (
                  <Card key={field.id} className="border-l-4 border-l-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium">Milestone {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <FormField
                          control={form.control}
                          name={`milestones.${index}.milestone_name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Milestone Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Down Payment" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`milestones.${index}.payment_percentage`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Percentage (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Calculated Amount and Remaining Amount */}
                      {baseAmount && form.watch(`milestones.${index}.payment_percentage`) > 0 && (
                        <div className="mb-3 p-2 bg-muted/50 rounded">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-sm text-muted-foreground">Amount: </span>
                              <span className="font-medium">
                                {formatCurrency(calculateMilestoneAmount(form.watch(`milestones.${index}.payment_percentage`)))}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Remaining: </span>
                              <span className="font-medium">
                                {formatCurrency((() => {
                                  // Calculate total percentage up to current milestone (inclusive)
                                  const currentMilestones = form.watch('milestones') || [];
                                  const totalPercentageUpToCurrent = currentMilestones
                                    .slice(0, index + 1)
                                    .reduce((sum, m) => sum + (parseFloat(m.payment_percentage?.toString() || '0') || 0), 0);
                                  
                                  // Remaining = base amount - total amount paid up to current milestone
                                  const baseAmountNum = parseFloat(baseAmount.toString());
                                  const totalPaidAmount = (baseAmountNum * totalPercentageUpToCurrent) / 100;
                                  return Math.max(0, baseAmountNum - totalPaidAmount);
                                })())}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`milestones.${index}.due_date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`milestones.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Payment conditions" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Invoice Upload Field */}
                        <FormField
                          control={form.control}
                          name={`milestones.${index}.invoice_file`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Invoice Upload (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    field.onChange(file);
                                  }}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Upload invoice to automatically mark milestone as completed
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddMilestone}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Milestone
                </Button>
              </CardContent>
            </Card>

            {/* Performance Thresholds (only for performance-based) */}
            {paymentModel === 'performance_based' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Performance Thresholds
                  </CardTitle>
                  <CardDescription>
                    Set performance targets that trigger bonus payments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {thresholdFields.map((field, index) => (
                    <Card key={field.id} className="border-l-4 border-l-blue-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium">Threshold {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeThreshold(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`performance_thresholds.${index}.metric`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Metric</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select metric" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="reach">Reach</SelectItem>
                                    <SelectItem value="engagement">Engagement</SelectItem>
                                    <SelectItem value="conversion">Conversion</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`performance_thresholds.${index}.threshold`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Threshold</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`performance_thresholds.${index}.bonus_percentage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bonus (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddThreshold}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Performance Threshold
                  </Button>
                </CardContent>
              </Card>
            )}
            </form>
          </Form>
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="sticky bottom-0 bg-background z-10 py-3 px-6 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="submit"
            form="content-post-form"
            disabled={isLoading || !isFormValid}
            className={!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isLoading ? 'Creating...' : 'Create Content Post & Agreement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentPostModal;
