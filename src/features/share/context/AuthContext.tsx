
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { forceAuthReset } from '@/utils/authCleanup';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce auth state changes to prevent excessive logging
  const lastAuthEventRef = useRef<string>('');
  const authDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener with debounced logging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Debounce auth logging to prevent spam
        const eventKey = `${event}-${session?.user?.id || 'null'}`;
        if (lastAuthEventRef.current !== eventKey) {
          lastAuthEventRef.current = eventKey;
          
          // Clear existing timeout
          if (authDebounceRef.current) {
            clearTimeout(authDebounceRef.current);
          }
          
          // Only log important auth events in development (10% sample rate)
          if (process.env.NODE_ENV === 'development' && 
              Math.random() < 0.1 &&
              (event === 'SIGNED_OUT' || event === 'USER_UPDATED')) {
            authDebounceRef.current = setTimeout(() => {
              console.log('AuthContext: Auth state change:', event, session?.user?.id);
            }, 500);
          }
        }

        // Update state synchronously
        setSession(session);
        setUser(session?.user ?? null);
        setError(null);
        
        // Set loading to false after state update
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    // Get initial session with stale auth detection
    const getInitialSession = async () => {
      try {
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          
          // Check for stale auth errors
          if (error.message?.includes('JWT expired') ||
              error.message?.includes('User from sub claim in JWT does not exist')) {
            console.warn('AuthContext: Stale auth detected, forcing reset');
            forceAuthReset();
            return;
          }
          
          setError(error.message);
        } else {
          // If we have a session, verify it's valid with optimized timeout
          if (session?.user) {
            try {
              const userPromise = supabase.auth.getUser();
              const userTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('User check timeout')), 8000) // Increased from 3s to 8s
              );
              
              const { error: userError } = await Promise.race([userPromise, userTimeoutPromise]) as any;
              
              if (userError) {
                if (userError.message?.includes('User from sub claim in JWT does not exist') ||
                    userError.message?.includes('user_not_found')) {
                  console.warn('AuthContext: Invalid user in session, forcing reset');
                  forceAuthReset();
                  return;
                }
              }
            } catch (userCheckError: any) {
              console.warn('AuthContext: User verification failed:', userCheckError);
              
              // Ignore timeout errors - session is probably valid
              if (userCheckError?.message === 'User check timeout') {
                console.log('AuthContext: User check timeout (non-critical), assuming valid session');
                setSession(session);
                setUser(session?.user ?? null);
                return;
              }
              
              if (userCheckError?.status === 403 ||
                  userCheckError?.message?.includes('User from sub claim in JWT does not exist')) {
                console.warn('AuthContext: 403 or user not found, forcing reset');
                forceAuthReset();
                return;
              }
            }
          }
          
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err: any) {
        console.error('Session check error:', err);
        
        // Ignore timeout errors - assume no session
        if (err?.message === 'Session check timeout') {
          console.log('AuthContext: Session check timeout, assuming no session');
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        // Handle auth errors in catch block too
        if (err?.message?.includes('User from sub claim in JWT does not exist') ||
            err?.status === 403) {
          console.warn('AuthContext: Auth error in session check, forcing reset');
          forceAuthReset();
          return;
        }
        
        if (mounted) {
          setError('Failed to check authentication status');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local storage items
      localStorage.removeItem('hasSeenEmployeeWelcome');
      sessionStorage.removeItem('registrationInProgress');
      
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error instanceof Error ? error.message : 'Error signing out');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
