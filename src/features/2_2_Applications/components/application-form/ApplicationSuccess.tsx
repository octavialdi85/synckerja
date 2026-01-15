
import { CheckCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';

interface ApplicationSuccessProps {
  profileLink: string;
  applicantName: string;
  onClose: () => void;
}

export function ApplicationSuccess({ profileLink, applicantName, onClose }: ApplicationSuccessProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto p-0">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Application Submitted Successfully!
            </h2>
            <p className="text-gray-600">
              Thank you, {applicantName}! Your job application has been received.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• We will review your application within 3-5 business days</li>
              <li>• You'll be contacted if your profile matches our requirements</li>
              <li>• Further instructions will be sent via WhatsApp</li>
            </ul>
          </div>

          <div className="text-center">
            <Button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
