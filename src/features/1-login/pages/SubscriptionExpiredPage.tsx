import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/features/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { AlertCircle, Calendar, CreditCard, RefreshCw, Building2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/features/ui/alert';
import { SubscriptionExpiryStatus } from '@/hooks/useSubscriptionExpiry';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { supabase } from '@/integrations/supabase/client';
// import { useTranslation } from 'react-i18next'; // Commented out - translation not available

interface SubscriptionExpiredPageProps {
  expiryStatus: SubscriptionExpiryStatus;
}

const SubscriptionExpiredPage = ({ expiryStatus }: SubscriptionExpiredPageProps) => {
  const navigate = useNavigate();
  const { organizationId } = useCurrentOrg();
  // const { t } = useTranslation(); // Commented out - translation not available

  // Fetch organization name
  const { data: organizationName } = useQuery({
    queryKey: ['organization-name', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('company_name')
        .eq('id', organizationId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching organization name:', error);
        return null;
      }
      
      return data?.company_name || null;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRenewSubscription = () => {
    navigate('/subscription/plans');
  };

  const expiredType = expiryStatus.isTrialExpired ? 'trial' : 'subscription';
  const expiredDate = expiryStatus.expiredDate ? formatDate(expiryStatus.expiredDate) : '-';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-4">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          {/* Organization Name */}
          {organizationName && (
            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700 mb-2">
              <Building2 className="h-5 w-5 text-gray-600" />
              <span>{organizationName}</span>
            </div>
          )}
          <CardTitle className="text-2xl md:text-3xl">
            {expiredType === 'trial' 
              ? 'Masa Trial Telah Berakhir'
              : 'Subscription Telah Berakhir'}
          </CardTitle>
          <CardDescription className="text-base">
            {expiredType === 'trial'
              ? 'Masa trial Anda telah berakhir. Silakan berlangganan untuk melanjutkan menggunakan aplikasi.'
              : 'Subscription Anda telah berakhir. Silakan perpanjang subscription untuk melanjutkan menggunakan aplikasi.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              Akses Dikunci
            </AlertTitle>
            <AlertDescription>
              Seluruh aplikasi terkunci hingga subscription diperpanjang.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Calendar className="h-4 w-4" />
                {expiredType === 'trial' 
                  ? 'Tanggal Berakhir Trial'
                  : 'Tanggal Berakhir Subscription'}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {expiredDate}
              </p>
            </div>

            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <RefreshCw className="h-4 w-4" />
                Hari Telah Berlalu
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {expiryStatus.daysExpired} hari
              </p>
            </div>
          </div>

          {expiryStatus.trialEndDate && expiryStatus.isTrialExpired && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Informasi Trial
                  </p>
                  <p className="text-sm text-blue-700">
                    Masa trial Anda telah berakhir pada {formatDate(expiryStatus.trialEndDate)}. Untuk melanjutkan, silakan pilih paket subscription yang sesuai dengan kebutuhan Anda.
                  </p>
                </div>
              </div>
            </div>
          )}

          {expiryStatus.subscriptionEndDate && expiryStatus.isSubscriptionExpired && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900 mb-1">
                    Informasi Subscription
                  </p>
                  <p className="text-sm text-orange-700">
                    Subscription Anda telah berakhir pada {formatDate(expiryStatus.subscriptionEndDate)}. Silakan perpanjang subscription untuk melanjutkan menggunakan semua fitur aplikasi.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button
              onClick={handleRenewSubscription}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
              size="lg"
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {expiredType === 'trial'
                ? 'Pilih Paket Subscription'
                : 'Perpanjang Subscription'}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            Butuh bantuan? Hubungi support kami untuk informasi lebih lanjut.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionExpiredPage;

