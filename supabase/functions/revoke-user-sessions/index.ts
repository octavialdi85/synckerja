import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESIGNED_STATUS_PRIORITY = ['terminated', 'inactive', 'resigned', 'dismissed'] as const

type ServiceSupabase = ReturnType<typeof createClient>

async function resolveResignedEmployeeStatusId(
  supabase: ServiceSupabase,
  organizationId: string
): Promise<string | null> {
  const { data: orgRows, error: orgErr } = await supabase
    .from('employee_statuses')
    .select('id, name')
    .eq('organization_id', organizationId)

  if (!orgErr && orgRows?.length) {
    const id = pickResignedStatusId(orgRows)
    if (id) return id
  }

  const { data: globalRows, error: globalErr } = await supabase
    .from('employee_statuses')
    .select('id, name')
    .is('organization_id', null)

  if (globalErr || !globalRows?.length) return null
  return pickResignedStatusId(globalRows)
}

function pickResignedStatusId(rows: { id: string; name: string }[]): string | null {
  const byLower = new Map(rows.map((r) => [r.name.trim().toLowerCase(), r.id]))
  for (const name of RESIGNED_STATUS_PRIORITY) {
    const id = byLower.get(name)
    if (id) return id
  }
  return null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`[revoke-user-sessions] Request received: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log('[revoke-user-sessions] Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { userId, employeeId, reason } = requestBody;
    console.log('[revoke-user-sessions] Processing employee resignation for:', { userId, employeeId, reason });

    // Validate required parameters
    if (!userId || !employeeId) {
      console.error('[revoke-user-sessions] Missing required parameters:', { userId, employeeId });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters: userId and employeeId'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[revoke-user-sessions] Missing environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current user making the request (admin/owner)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify the requesting user's permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      console.error('[revoke-user-sessions] Authentication error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get user's active organization from profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('active_organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile?.active_organization_id) {
      console.error('[revoke-user-sessions] Error getting user profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'User organization not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if requesting user has admin/owner role in their active organization
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', userProfile.active_organization_id)
      .in('role', ['owner', 'admin'])
      .single();

    if (roleError || !userRole) {
      console.error('[revoke-user-sessions] Permission denied - user is not admin/owner:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Permission denied. Only admins and owners can resign employees.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Verify the employee belongs to the same organization
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('user_id, organization_id, full_name')
      .eq('id', employeeId)
      .eq('organization_id', userRole.organization_id)
      .single();

    if (empError || !employee) {
      console.error('[revoke-user-sessions] Employee not found or not in same organization:', empError);
      return new Response(
        JSON.stringify({ success: false, error: 'Employee not found or not in the same organization' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if the employee being resigned is the owner of the current organization
    const { data: employeeRole, error: empRoleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', userRole.organization_id)
      .maybeSingle();

    if (empRoleError) {
      console.error('[revoke-user-sessions] Error checking employee role:', empRoleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking employee role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Prevent resignation of organization owner
    if (employeeRole?.role === 'owner') {
      console.log('[revoke-user-sessions] Cannot resign organization owner');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot resign organization owner. Transfer ownership first if needed.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('[revoke-user-sessions] Starting resignation process for employee:', employee.full_name);

    // Get all organizations where the user is an owner (these should remain active)
    const { data: ownedOrgs, error: ownedOrgsError } = await supabase
      .from('user_roles')
      .select('organization_id, organizations:organization_id(company_name)')
      .eq('user_id', userId)
      .eq('role', 'owner');

    if (ownedOrgsError) {
      console.error('[revoke-user-sessions] Error fetching owned organizations:', ownedOrgsError);
    }

    const ownedOrgIds = ownedOrgs?.map(org => org.organization_id) || [];
    const ownedOrgNames = ownedOrgs?.map(org => org.organizations?.company_name).filter(Boolean) || [];

    console.log('[revoke-user-sessions] User owns organizations:', ownedOrgNames);

    // 1. Set employee_status_id to a non-active status (employees.status column removed)
    const resignedStatusId = await resolveResignedEmployeeStatusId(supabase, userRole.organization_id);
    if (!resignedStatusId) {
      console.error('[revoke-user-sessions] No terminated/inactive/resigned employee_status row for org');
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'No resigned status configured. Add an employee status named Terminated, Inactive, or Resigned (org or global).',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('employees')
      .update({
        employee_status_id: resignedStatusId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('[revoke-user-sessions] Error updating employee_status_id:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update employee status: ' + updateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 2. Deactivate user's access to the organization that resigned them (user_organizations)
    const { error: deactivateError } = await supabase
      .from('user_organizations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', userRole.organization_id);

    if (deactivateError) {
      console.error('[revoke-user-sessions] Error deactivating organization access:', deactivateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to deactivate organization access: ' + deactivateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 3. Remove user_roles for this org so the user has no role and cannot access the org
    const { error: deleteRoleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', userRole.organization_id);

    if (deleteRoleError) {
      console.error('[revoke-user-sessions] Error removing user role:', deleteRoleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to remove user role: ' + deleteRoleError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 4. Update profile active_organization_id: switch to owned org if any, otherwise clear
    if (ownedOrgIds.length > 0) {
      const newActiveOrgId = ownedOrgIds[0];
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          active_organization_id: newActiveOrgId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileUpdateError) {
        console.error('[revoke-user-sessions] Error updating user profile with new active organization:', profileUpdateError);
      } else {
        console.log('[revoke-user-sessions] User active organization switched to:', newActiveOrgId);
      }
    } else {
      // User has no other orgs they own; clear active_organization_id so they cannot access the resigned org
      const { error: profileClearError } = await supabase
        .from('profiles')
        .update({
          active_organization_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileClearError) {
        console.error('[revoke-user-sessions] Error clearing user active organization:', profileClearError);
      } else {
        console.log('[revoke-user-sessions] User active organization cleared (no other orgs)');
      }
    }

    // 5. Get the organization name that resigned the user
    const { data: resigningOrg, error: resigningOrgError } = await supabase
      .from('organizations')
      .select('company_name')
      .eq('id', userRole.organization_id)
      .single();

    const resigningOrgName = resigningOrg?.company_name || 'Unknown Organization';

    // 6. Log the resign action for audit trail
    console.log('[revoke-user-sessions] Employee resigned successfully:', {
      employeeId,
      employeeName: employee.full_name,
      resignedBy: user.id,
      resigningOrganization: resigningOrgName,
      remainingActiveOrganizations: ownedOrgNames,
      reason: reason || 'Manual resign',
      timestamp: new Date().toISOString()
    });

    // Prepare response message
    let responseMessage = `${employee.full_name} has been resigned from ${resigningOrgName}. `;
    responseMessage += `Their access to ${resigningOrgName} has been deactivated. `;

    if (ownedOrgNames.length > 0) {
      responseMessage += `They retain access to organizations they own: ${ownedOrgNames.join(', ')}. `;
      responseMessage += `Their active organization has been switched to ${ownedOrgNames[0]}. `;
    }

    responseMessage += `They can still log in with their existing credentials.`;

    return new Response(
      JSON.stringify({
        success: true,
        message: responseMessage,
        employeeName: employee.full_name,
        deactivatedOrganization: resigningOrgName,
        remainingActiveOrganizations: ownedOrgNames,
        employeeStatusUpdated: true,
        userOrganizationDeactivated: true,
        userRoleRemoved: true,
        activeOrganizationSwitched: ownedOrgIds.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[revoke-user-sessions] Error in employee resignation function:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
