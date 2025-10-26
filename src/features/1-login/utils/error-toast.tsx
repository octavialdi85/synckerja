
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ErrorToastProps {
  title: string;
  message: string;
}

export const showErrorToast = ({ title, message }: ErrorToastProps) => {
  toast.error(title, {
    description: message,
    duration: 5000,
    className: "bg-red-50 border-red-200 text-red-900",
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    style: {
      background: '#fef2f2',
      borderColor: '#fecaca',
      color: '#7f1d1d',
    },
  });
};

export const showSuccessToast = ({ title, message }: ErrorToastProps) => {
  toast.success(title, {
    description: message,
    duration: 4000,
    className: "bg-green-50 border-green-200 text-green-900",
    style: {
      background: '#f0fdf4',
      borderColor: '#bbf7d0',
      color: '#14532d',
    },
  });
};
