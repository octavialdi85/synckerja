import { useSearchParams } from 'react-router-dom';
import { EmailVerificationStatus } from "@/features/1-login/components/EmailVerificationStatus";

const EmailVerified = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;
  
  return <EmailVerificationStatus token={token} />;
};

export default EmailVerified;
