import { Badge } from '@/features/ui/badge';
interface Rate {
  id: string;
  platform: string;
  content_type: string;
  rate_amount: number;
  currency: string;
  rate_type: string;
}
interface RatesCellProps {
  platform: string;
  contentType: string;
  rates?: Rate[];
}
export const RatesCell = ({
  platform,
  contentType,
  rates = []
}: RatesCellProps) => {
  // Find matching rate based on platform and content type
  const matchingRate = rates.find(rate => rate.platform.toLowerCase() === platform.toLowerCase() && rate.content_type.toLowerCase() === contentType.toLowerCase());
  if (!matchingRate) {
    return <div className="text-xs text-slate-400">
        No rate set
      </div>;
  }
  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}/ Post`;
  };
  const formatRateType = (rateType: string) => {
    return rateType.replace('_', ' ').toLowerCase();
  };
  return <div className="space-y-1">
      <div className="text-sm font-medium text-slate-900">
        {formatAmount(matchingRate.rate_amount, matchingRate.currency)}
      </div>
      
    </div>;
};
