
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, Clock } from 'lucide-react';

export const SubscriptionLockModal = () => {
  const navigate = useNavigate();

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Subscription Expired
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Your subscription has expired. Please renew your subscription to continue using the application.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Access to all features has been temporarily suspended</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/subscription/plans')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Renew Subscription
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate('/subscription/plans')}
              className="w-full"
            >
              View Plans
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
