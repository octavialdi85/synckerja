/**
 * Test Utilities for Permission System
 * 
 * This file provides utilities to test and validate the permission system
 * functionality. It can be used for debugging and ensuring permissions work correctly.
 */

import { supabase } from '@/integrations/supabase/client';
import { EXPECTED_DEFAULT_PERMISSION_CONFIGURATIONS } from '@/config/routePermissions';

export interface PermissionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test if a user can access a specific page path
 */
export const testPageAccess = async (
  userId: string,
  userRole: string,
  pagePath: string,
  organizationId: string
): Promise<PermissionTestResult> => {
  try {
    // Get permission configuration for the path
    const { data: configs, error } = await supabase
      .from('permission_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('page_path', pagePath)
      .eq('is_active', true);

    if (error) {
      return {
        success: false,
        message: `Database error: ${error.message}`,
        details: error
      };
    }

    if (!configs || configs.length === 0) {
      return {
        success: true,
        message: `No permission configuration found for ${pagePath} - access allowed by default`,
        details: { configFound: false, defaultAccess: true }
      };
    }

    const config = configs[0];
    const rolesAllowed = config.roles_allowed || [];
    const exceptions = config.exceptions || [];

    // Check if user role is allowed
    const hasRoleAccess = rolesAllowed.includes(userRole);
    
    // Check if user is in exceptions list
    const isException = exceptions.includes(userId);

    const hasAccess = hasRoleAccess || isException;

    return {
      success: true,
      message: hasAccess 
        ? `Access granted to ${pagePath} for user ${userId}` 
        : `Access denied to ${pagePath} for user ${userId}`,
      details: {
        configFound: true,
        hasRoleAccess,
        isException,
        finalAccess: hasAccess,
        userRole,
        rolesAllowed,
        exceptions: exceptions.length
      }
    };

  } catch (error) {
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
};

/**
 * Verify that all expected default permission configurations exist
 */
export const verifyDefaultPermissionConfigurations = async (): Promise<PermissionTestResult> => {
  try {
    // Get all system-wide default configurations (organization_id = null)
    const { data: configs, error } = await supabase
      .from('permission_configurations')
      .select('*')
      .is('organization_id', null)
      .eq('is_active', true);

    if (error) {
      return {
        success: false,
        message: `Database error: ${error.message}`,
        details: error
      };
    }

    const foundPaths = (configs || []).map(c => c.page_path);
    const expectedPaths = EXPECTED_DEFAULT_PERMISSION_CONFIGURATIONS.map(c => c.page_path);
    
    const missingPaths = expectedPaths.filter(path => !foundPaths.includes(path));
    const extraPaths = foundPaths.filter(path => !expectedPaths.includes(path));

    const isComplete = missingPaths.length === 0;

    return {
      success: true,
      message: isComplete 
        ? 'All expected default permission configurations found'
        : `Missing ${missingPaths.length} expected default configurations`,
      details: {
        isComplete,
        foundCount: foundPaths.length,
        expectedCount: expectedPaths.length,
        missingPaths,
        extraPaths,
        foundConfigurations: configs?.map(c => ({
          path: c.page_path,
          title: c.page_title,
          roles: c.roles_allowed
        }))
      }
    };

  } catch (error) {
    return {
      success: false,
      message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
};

/**
 * Create a test permission configuration for testing purposes
 */
export const createTestPermissionConfiguration = async (
  organizationId: string,
  testData: {
    page_path: string;
    page_title: string;
    roles_allowed: string[];
    exceptions?: string[];
    exception_paths?: string[];
  }
): Promise<PermissionTestResult> => {
  try {
    const { data, error } = await supabase
      .from('permission_configurations')
      .insert([{
        organization_id: organizationId,
        page_path: testData.page_path,
        page_title: testData.page_title,
        roles_allowed: testData.roles_allowed,
        exceptions: testData.exceptions || [],
        exception_paths: testData.exception_paths || [],
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: `Failed to create test configuration: ${error.message}`,
        details: error
      };
    }

    return {
      success: true,
      message: `Test permission configuration created for ${testData.page_path}`,
      details: data
    };

  } catch (error) {
    return {
      success: false,
      message: `Test creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
};

/**
 * Clean up test permission configurations
 */
export const cleanupTestPermissionConfigurations = async (
  organizationId: string,
  testPaths: string[]
): Promise<PermissionTestResult> => {
  try {
    const { error } = await supabase
      .from('permission_configurations')
      .delete()
      .eq('organization_id', organizationId)
      .in('page_path', testPaths);

    if (error) {
      return {
        success: false,
        message: `Failed to cleanup test configurations: ${error.message}`,
        details: error
      };
    }

    return {
      success: true,
      message: `Cleaned up ${testPaths.length} test permission configurations`,
      details: { cleanedPaths: testPaths }
    };

  } catch (error) {
    return {
      success: false,
      message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
};

/**
 * Run a comprehensive test suite for the permission system
 */
export const runPermissionTestSuite = async (
  testUserId: string,
  testUserRole: string,
  organizationId: string
): Promise<PermissionTestResult[]> => {
  const results: PermissionTestResult[] = [];

  // Test 1: Verify default configurations exist
  console.log('🧪 Testing: Default permission configurations...');
  const defaultConfigTest = await verifyDefaultPermissionConfigurations();
  results.push(defaultConfigTest);

  // Test 2: Test access to protected routes
  const protectedRoutes = [
    '/access-permissions',
    '/subscription',
    '/employee-management',
    '/digital-marketing'
  ];

  for (const route of protectedRoutes) {
    console.log(`🧪 Testing: Access to ${route}...`);
    const accessTest = await testPageAccess(testUserId, testUserRole, route, organizationId);
    results.push(accessTest);
  }

  // Test 3: Create and test a custom configuration
  console.log('🧪 Testing: Custom permission configuration...');
  const testPath = '/test-permission-path';
  const createTest = await createTestPermissionConfiguration(organizationId, {
    page_path: testPath,
    page_title: 'Test Permission Page',
    roles_allowed: ['owner'],
    exceptions: [testUserId]
  });
  results.push(createTest);

  if (createTest.success) {
    // Test access to the custom configuration
    const customAccessTest = await testPageAccess(testUserId, testUserRole, testPath, organizationId);
    results.push(customAccessTest);

    // Cleanup
    const cleanupTest = await cleanupTestPermissionConfigurations(organizationId, [testPath]);
    results.push(cleanupTest);
  }

  return results;
};

/**
 * Console helper to run tests and display results
 */
export const displayTestResults = (results: PermissionTestResult[]) => {
  console.log('\n🧪 Permission System Test Results:');
  console.log('=====================================');
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.message}`);
    
    if (result.details && typeof result.details === 'object') {
      console.log('   Details:', JSON.stringify(result.details, null, 2));
    }
    console.log('');
  });

  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Permission system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the permission configurations.');
  }
};
