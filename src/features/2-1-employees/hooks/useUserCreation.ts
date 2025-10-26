
import { supabase } from '@/integrations/supabase/client';

export const useUserCreation = () => {

  const createUser = async (email: string, name: string, organizationId: string, role?: string) => {
    console.log('🚀 useUserCreation.createUser called with:', { email, name, organizationId, role });
    
    try {
      // Use edge function for user creation with admin privileges
      console.log('📝 Creating user via edge function...');
      const { data: createUserData, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: email.trim().toLowerCase(),
          name: name.trim(),
          organizationId: organizationId,
          role: role || 'employee'
        }
      });

      if (createUserError) {
        console.error('❌ Edge function error:', createUserError);
        return null;
      }

      if (!createUserData?.success) {
        console.error('❌ Edge function returned failure:', createUserData);
        return null;
      }

      const userId = createUserData.userId;
      console.log('✅ User created successfully with ID:', userId);
      console.log('✅ Profile created:', createUserData.profile);
      console.log('✅ User organization created:', createUserData.userOrganization);
      console.log('✅ Magic link entry created:', createUserData.magicLink);
      
      return userId;
      
    } catch (err: any) {
      console.error('❌ User creation error:', err);
      return null;
    }
  };

  return { createUser };
};
