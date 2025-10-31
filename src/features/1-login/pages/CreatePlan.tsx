import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Slider } from '@/features/ui/slider';
import { Switch } from '@/features/ui/switch';
import { Label } from '@/features/ui/label';
import { Check, Zap, Users, Shield, Star, Loader2 } from 'lucide-react';
import { useSubscriptionPlans } from '@/features/1-login/hooks/useSubscriptionPlans';
import { useOptimizedSubscription, SubscriptionPlan } from '@/features/1-login/hooks/useOptimizedSubscription';
import { useMidtransPayment } from '@/features/1-login/hooks/useMidtransPayment';
import { useCreateSubscription } from '@/features/1-login/hooks/useCreateSubscription';
import { useEmployeeCount } from '@/features/1-login/hooks/useEmployeeCount';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { formatIDR, getMonthlyPriceForMembers, getYearlyPriceForMembers } from '@/features/1-login/utils/subscriptionUtils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';

const CreatePlan = () => {
  const [memberCounts, setMemberCounts] = useState<{ [key: string]: number }>({});
  const [billingCycles, setBillingCycles] = useState<{ [key: string]: 'monthly' | 'yearly' }>({});
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedMemberCount, setSelectedMemberCount] = useState(1);
  const [fallbackOrgId, setFallbackOrgId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const { initiateMidtransPayment } = useMidtransPayment();
  const { mutate: createSubscription, isPending: isCreatingSubscription } = useCreateSubscription();
  const { data: currentEmployeeCount = 0 } = useEmployeeCount();
  const { organizationId, loading: orgLoading } = useCurrentOrg();
  const { isAuthenticated, isEmailVerified, hasOrganization, loading: userDataLoading } = useCentralizedUserData();

  // Fallback mechanism to check sessionStorage if organizationId is not available
  useEffect(() => {
    if (!organizationId && !orgLoading) {
      const newOrgId = sessionStorage.getItem('newOrganizationId');
      if (newOrgId) {
        console.log('📋 CreatePlan: Using fallback organization ID from sessionStorage:', newOrgId);
        setFallbackOrgId(newOrgId);
        // Don't remove it here, let useCurrentOrg handle it
      }
    }
  }, [organizationId, orgLoading]);

  // Check authentication and email verification before rendering
  useEffect(() => {
    if (userDataLoading) return;
    
    // Check if organization was just created (skip redirect to create-organization)
    const organizationJustCreated = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('organizationJustCreated') === 'true';
    
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!isEmailVerified) {
      navigate('/verify-email', { replace: true });
      return;
    }
    
    // Skip redirect to create-organization if organization was just created
    // This ensures create-plan page stays visible on mobile after organization creation
    if (!hasOrganization && !organizationJustCreated) {
      navigate('/create-organization', { replace: true });
      return;
    }
    
    // If organization was just created but context hasn't updated yet, show loading
    if (organizationJustCreated && !hasOrganization) {
      console.log('CreatePlan: Organization just created, waiting for context update...');
      // Don't redirect, just wait for context to update
      return;
    }
  }, [isAuthenticated, isEmailVerified, hasOrganization, userDataLoading, navigate]);

  // Use organizationId from hook or fallback - prioritize fallback for new organizations
  const effectiveOrgId = fallbackOrgId || organizationId;
  const isOrgReady = Boolean(effectiveOrgId);

  // Extract employee limit from plan features
  const getEmployeeLimitFromFeatures = (features: string[]) => {
    if (!features || !Array.isArray(features)) return 100;
    
    for (const feature of features) {
      const match = feature.match(/(\d+)\s*(employee\s*limit|karyawan|orang|employees?|members?)/i);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 100;
  };

  // Initialize memberCounts state properly for each plan
  useEffect(() => {
    if (!plans || Object.keys(memberCounts).length > 0) return;

    const newMemberCounts: { [key: string]: number } = {};

    plans.forEach(plan => {
      const hasFreeTrial = plan.jumlah_hari_trial && plan.jumlah_hari_trial > 0;
      const isFreePlan = plan.base_price_per_member === 0 || plan.name.toLowerCase().includes('free');
      const isTrialPlan = hasFreeTrial || isFreePlan;
      const maxEmployees = isTrialPlan ? getEmployeeLimitFromFeatures(plan.features) : 100;
      
      const defaultCount = isTrialPlan ? maxEmployees : 5;
      newMemberCounts[plan.id] = defaultCount;
    });

    setMemberCounts(newMemberCounts);
  }, [plans]);

  const handleMemberCountChange = (planId: string, count: number) => {
    setMemberCounts(prev => ({ ...prev, [planId]: count }));
  };

  const handleBillingCycleChange = (planId: string, isYearly: boolean) => {
    setBillingCycles(prev => ({ ...prev, [planId]: isYearly ? 'yearly' : 'monthly' }));
  };

  const calculatePlanPrice = (plan: any, memberCount: number, isYearly: boolean) => {
    const basePrice = plan.base_price_per_member * memberCount;
    if (isYearly && plan.annual_discount_percentage) {
      return basePrice * 12 * (1 - plan.annual_discount_percentage / 100);
    }
    return isYearly ? basePrice * 12 : basePrice;
  };

  const handleChoosePlan = async (plan: SubscriptionPlan, memberCount: number) => {
    console.log('🚀 Choosing plan:', plan.name, 'with', memberCount, 'members');
    
    // Check if organization ID is available (use effectiveOrgId)
    if (!effectiveOrgId) {
      console.error('❌ No organization ID available, cannot create subscription');
      toast.error('Organization ID tidak tersedia. Silakan refresh halaman.');
      return;
    }
    
    const selectedBillingCycle = billingCycles[plan.id] || 'monthly';
    const isYearly = selectedBillingCycle === 'yearly';
    
    // Check if plan has free trial (jumlah_hari_trial > 0) or is completely free
    const hasFreeTrial = plan.jumlah_hari_trial && plan.jumlah_hari_trial > 0;
    const isFreePlan = plan.base_price_per_member === 0 || plan.name.toLowerCase().includes('free');
    const isFreePlanWithTrial = hasFreeTrial || isFreePlan;
    
    console.log('🔍 Plan analysis:', {
      planName: plan.name,
      hasFreeTrial,
      isFreePlan,
      jumlahHariTrial: plan.jumlah_hari_trial,
      basePricePerMember: plan.base_price_per_member,
      effectiveOrgId
    });
    
    // If it's a free trial plan or completely free plan, create subscription directly
    if (isFreePlanWithTrial) {
      console.log('✅ Creating free trial/free subscription directly');
      createSubscription({
        plan_id: plan.id,
        plan_name: plan.name,
        member_count: memberCount,
        billing_cycle: selectedBillingCycle,
        is_free_forever: isFreePlan && !hasFreeTrial,
      });
      return;
    }

    // For paid plans without trial (jumlah_hari_trial is NULL), use Midtrans payment
    console.log('💳 Initiating Midtrans payment for paid plan');
    try {
      const finalAmount = isYearly
        ? getYearlyPriceForMembers(plan, memberCount)
        : getMonthlyPriceForMembers(plan, memberCount);

      await initiateMidtransPayment({
        planId: plan.id,
        planName: plan.name,
        amount: finalAmount,
        memberCount: memberCount,
        billingCycle: selectedBillingCycle,
      });
    } catch (error) {
      console.error('❌ Payment failed:', error);
      toast.error('Gagal memproses pembayaran');
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('basic')) return Users;
    if (planName.toLowerCase().includes('professional')) return Zap;
    if (planName.toLowerCase().includes('enterprise')) return Shield;
    return Star;
  };

  // Check if organization was just created (for loading state logic)
  const organizationJustCreated = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('organizationJustCreated') === 'true';
  
  // Show loading state while checking authentication and email verification
  // Also show loading if organization was just created but context hasn't updated yet
  if (userDataLoading || (organizationJustCreated && !hasOrganization && !orgLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <Card className="w-full max-w-md shadow border rounded-2xl bg-white">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Memuat Data...</h2>
            <p className="text-gray-600 text-sm">Mohon tunggu sebentar...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">Pilih Paket Subscription</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Kelola tim dan organisasi Anda dengan fitur lengkap HRIS. 
            Pilih paket yang sesuai dengan kebutuhan perusahaan Anda.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans?.map((plan) => {
            const hasFreeTrial = plan.jumlah_hari_trial && plan.jumlah_hari_trial > 0;
            const isFreePlan = plan.base_price_per_member === 0 || plan.name.toLowerCase().includes('free');
            const isTrialPlan = hasFreeTrial || isFreePlan;
            const maxEmployees = isTrialPlan ? getEmployeeLimitFromFeatures(plan.features) : 100;
            
            const memberCount = memberCounts[plan.id] !== undefined 
              ? memberCounts[plan.id]
              : (isTrialPlan ? maxEmployees : 5);
              
            const billingCycle = billingCycles[plan.id] || 'monthly';
            const isYearly = billingCycle === 'yearly';
            const totalPrice = calculatePlanPrice(plan, memberCount, isYearly);
            const monthlyPrice = plan.base_price_per_member * memberCount;
            const IconComponent = getPlanIcon(plan.name);
            
            const isPopular = plan.name.toLowerCase().includes('professional');
            
            return (
                <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:shadow-xl flex flex-col ${
                  isPopular 
                    ? 'border-2 border-blue-500 shadow-lg' 
                    : 'border border-gray-200'
                }`}
                style={{ minHeight: '600px' }} // Point 1: Ensure consistent height
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-4 py-1">
                      Paling Populer
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className={`p-3 rounded-full ${
                      isPopular 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {plan.name}
                    </CardTitle>
                    {/* Point 3: Trial badge positioned below plan name */}
                    <div className="mt-2">
                      {plan.jumlah_hari_trial && plan.jumlah_hari_trial > 0 ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Free Trial {plan.jumlah_hari_trial} hari
                        </Badge>
                      ) : plan.jumlah_hari_trial === null ? (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Free Forever
                        </Badge>
                      ) : null}
                    </div>
                    <CardDescription className="text-base text-gray-600 mt-2">
                      {plan.description}
                    </CardDescription>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-gray-900">
                      {formatIDR(totalPrice)}
                    </div>
                    <p className="text-sm text-gray-600">
                      per {isYearly ? 'tahun' : 'bulan'} untuk {memberCount} member
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-6">
                  {/* Member Count Slider */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium text-gray-700">
                        Jumlah Member: {memberCount}
                      </Label>
                      <span className="text-xs text-gray-500">
                        {isTrialPlan ? `(maksimal ${maxEmployees})` : ''}
                      </span>
                    </div>
                    <Slider
                      value={[memberCount]}
                      onValueChange={(value) => handleMemberCountChange(plan.id, value[0])}
                      max={isTrialPlan ? maxEmployees : 100}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1 member</span>
                      <span>{isTrialPlan ? `${maxEmployees} member` : '100 member'}</span>
                    </div>
                  </div>

                  {/* Annual Toggle - Point 2: Keep for all plans for consistency */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`annual-${plan.id}`} className="text-sm font-medium">
                        Pembayaran Tahunan
                      </Label>
                      <Switch
                        id={`annual-${plan.id}`}
                        checked={isYearly}
                        onCheckedChange={(checked) => handleBillingCycleChange(plan.id, checked)}
                        disabled={isTrialPlan || !plan.annual_discount_percentage}
                      />
                    </div>
                    {isYearly && plan.annual_discount_percentage && (
                      <div className="text-sm text-green-600 font-medium">
                        Hemat {plan.annual_discount_percentage}% per tahun!
                      </div>
                    )}
                    {(isTrialPlan || !plan.annual_discount_percentage) && (
                      <div className="text-xs text-gray-500">
                        {isTrialPlan ? 'Tidak tersedia untuk plan trial' : 'Tidak ada diskon tahunan'}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Fitur yang termasuk:</h4>
                    <ul className="space-y-2">
                      {plan.features?.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Harga per member:</span>
                      <span className="font-medium">{formatIDR(plan.base_price_per_member)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal {isYearly ? 'tahunan' : 'bulanan'}:</span>
                      <span className="font-medium">{formatIDR(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total {isYearly ? 'tahunan' : 'bulanan'}:</span>
                      <span>{formatIDR(totalPrice)}</span>
                    </div>
                  </div>

                  {/* Point 1: Use margin-top auto to push button to bottom */}
                  <div className="mt-auto">
                    <Button
                      onClick={() => handleChoosePlan(plan, memberCount)}
                      disabled={!isOrgReady || isCreatingSubscription || plan.description?.toLowerCase().includes('coming soon') || plan.description?.toLowerCase().includes('comming soon')}
                      className={`w-full h-12 text-base font-semibold ${
                        plan.description?.toLowerCase().includes('coming soon') || plan.description?.toLowerCase().includes('comming soon')
                          ? 'bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed'
                          : isTrialPlan
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : isPopular
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                    >
                      {plan.description?.toLowerCase().includes('coming soon') || plan.description?.toLowerCase().includes('comming soon')
                        ? 'Coming Soon'
                        : !isOrgReady 
                          ? 'Loading...'
                          : isCreatingSubscription 
                            ? 'Memproses...' 
                            : 'Pilih Plan'
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreatePlan;