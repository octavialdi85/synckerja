import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/features/ui/button';
import { useAuth } from '@/features/1-login/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Check authentication status and redirect accordingly
  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated, redirect to home
        navigate('/', { replace: true });
      } else {
        // User is not authenticated, redirect to login
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to ProfitLoop
          </h1>
          <p className="text-gray-600 mb-6">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to ProfitLoop
        </h1>
        <p className="text-gray-600 mb-6">
          Your business management platform
        </p>
        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Go to Login
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full"
          >
            Go to Home
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Checking authentication status...
        </p>
      </div>
    </div>
  );
};

export default Index;
