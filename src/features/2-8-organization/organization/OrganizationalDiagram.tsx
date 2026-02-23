
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Input } from '@/features/ui/input';
import { 
  Building2, 
  Search,
  Crown,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useEmployees } from '@/features/2-1-employees/hooks/useEmployees';
import { useCurrentUserEmployee } from '@/features/1-login/hooks/useCurrentUserEmployee';
import { getPhotoUrl, getInitials } from '@/features/2-1-employees/hooks/photoUtils';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { isEmployeeInOrganizationalStructure } from '@/features/2-1-employees/utils/employeeUtils';

interface OrganizationalDiagramProps {
  onEmployeeClick?: (employeeId: string) => void;
}

interface HierarchyNode {
  id: string;
  employee: any;
  level: number;
  levelName: string;
  children: HierarchyNode[];
}

export const OrganizationalDiagram = ({ onEmployeeClick }: OrganizationalDiagramProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: allEmployees = [], isLoading } = useEmployees();
  const { data: currentUserEmployee } = useCurrentUserEmployee();
  const { organization, organizationName: contextOrganizationName } = useCentralizedUserData();

  // Exclude only resigned/terminated/inactive/pending removal; include active, probation, contract, etc.
  const employees = React.useMemo(
    () => allEmployees.filter(isEmployeeInOrganizationalStructure),
    [allEmployees]
  );

  // Build hierarchy based on job levels
  const buildHierarchy = React.useMemo(() => {
    if (!employees.length) return { nodes: [], organizationName: '' };

    // Find organization owner
    const owner = employees.find(emp => emp.is_organization_owner);
    // Get organization name from context (current active organization)
    const organizationName = contextOrganizationName || organization?.company_name || 'Organization';

    // Get job level order for sorting
    const getJobLevelOrder = (levelName: string): number => {
      const level = levelName?.toLowerCase() || '';
      if (level.includes('owner') || level.includes('pemilik')) return 10;
      if (level.includes('executive') || level.includes('eksekutif')) return 9;
      if (level.includes('director') || level.includes('direktur')) return 8;
      if (level.includes('manager') || level.includes('manajer')) return 7;
      if (level.includes('supervisor') || level.includes('lead')) return 6;
      if (level.includes('senior')) return 5;
      if (level.includes('junior')) return 4;
      if (level.includes('staff') || level.includes('karyawan')) return 3;
      if (level.includes('intern') || level.includes('magang')) return 2;
      return 1;
    };

    // Sort employees by job level order (highest first)
    const sortedEmployees = [...employees].sort((a, b) => {
      if (a.is_organization_owner && !b.is_organization_owner) return -1;
      if (!a.is_organization_owner && b.is_organization_owner) return 1;
      
      const aLevel = getJobLevelOrder(a.job_level_name || '');
      const bLevel = getJobLevelOrder(b.job_level_name || '');
      return bLevel - aLevel;
    });

    // Create hierarchy nodes
    const createNode = (employee: any, level: number): HierarchyNode => ({
      id: employee.id,
      employee,
      level,
      levelName: employee.job_level_name || 'Employee',
      children: []
    });

    // Build the hierarchy tree
    const rootNodes: HierarchyNode[] = [];
    const processedEmployees = new Set<string>();

    // Start with organization owner
    if (owner) {
      const ownerNode = createNode(owner, 0);
      rootNodes.push(ownerNode);
      processedEmployees.add(owner.id);

      // Add other employees as children based on hierarchy
      let currentLevel = [ownerNode];
      let nextLevel: HierarchyNode[] = [];

      for (const employee of sortedEmployees) {
        if (processedEmployees.has(employee.id)) continue;

        const employeeLevel = getJobLevelOrder(employee.job_level_name || '');
        
        // Find the best parent (employee with higher level)
        let bestParent: HierarchyNode | null = null;
        let bestParentLevel = -1;

        const findBestParent = (nodes: HierarchyNode[]) => {
          for (const node of nodes) {
            const nodeLevel = getJobLevelOrder(node.employee.job_level_name || '');
            if (nodeLevel > employeeLevel && nodeLevel > bestParentLevel) {
              bestParent = node;
              bestParentLevel = nodeLevel;
            }
            if (node.children.length > 0) {
              findBestParent(node.children);
            }
          }
        };

        findBestParent(rootNodes);

        const newNode = createNode(employee, bestParent ? bestParent.level + 1 : 1);
        
        if (bestParent) {
          bestParent.children.push(newNode);
        } else {
          // If no suitable parent found, add to root level
          rootNodes.push(newNode);
        }

        processedEmployees.add(employee.id);
      }
    } else {
      // If no owner, create flat structure by job level
      for (const employee of sortedEmployees) {
        const node = createNode(employee, 0);
        rootNodes.push(node);
      }
    }

    return { nodes: rootNodes, organizationName };
  }, [employees, contextOrganizationName, organization]);

  // Filter nodes based on search
  const filteredNodes = React.useMemo(() => {
    if (!searchTerm) return buildHierarchy.nodes;
    
    const filterNodes = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.filter(node => {
        const matchesSearch = node.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          node.levelName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const hasMatchingChildren = node.children.length > 0 && filterNodes(node.children).length > 0;
        
        return matchesSearch || hasMatchingChildren;
      }).map(node => ({
        ...node,
        children: filterNodes(node.children)
      }));
    };
    
    return filterNodes(buildHierarchy.nodes);
  }, [buildHierarchy.nodes, searchTerm]);

  const renderNode = (node: HierarchyNode) => {
    const isOwner = node.employee.is_organization_owner;
    
    // Check if this employee is the current user and use their profile photo
    const isCurrentUser = currentUserEmployee && (
      node.employee.id === currentUserEmployee.id || 
      node.employee.user_id === currentUserEmployee.user_id
    );
    
    const avatarPhotoUrl = isCurrentUser && currentUserEmployee?.profile_photo_url 
      ? currentUserEmployee.profile_photo_url 
      : node.employee.photo_url;
    
    return (
      <div key={node.id} className="flex flex-col items-center mb-8">
        {/* Employee Node */}
        <div className="relative">
          <div 
            className={`rounded-lg p-4 min-w-[200px] text-center shadow-lg cursor-pointer transition-all hover:shadow-xl ${
              isOwner 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
                : node.level === 1 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                  : 'bg-white border-2 border-gray-200 text-gray-900'
            }`}
            onClick={() => onEmployeeClick?.(node.employee.id)}
          >
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-16 w-16">
                {getPhotoUrl(avatarPhotoUrl) && (
                  <AvatarImage 
                    src={getPhotoUrl(avatarPhotoUrl)!} 
                    alt={node.employee.full_name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className={`text-lg font-semibold ${
                  isOwner ? 'bg-blue-100 text-blue-600' : 
                  node.level === 1 ? 'bg-green-100 text-green-600' : 
                  'bg-gray-100 text-gray-600'
                }`}>
                  {getInitials(node.employee.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="font-semibold text-lg">
                    {node.employee.full_name}
                  </span>
                  {isOwner && (
                    <Crown className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
                
                <Badge 
                  variant={isOwner ? "secondary" : "outline"} 
                  className={`mb-2 ${
                    isOwner ? 'bg-blue-100 text-blue-800' : 
                    node.level === 1 ? 'bg-green-100 text-green-800' : ''
                  }`}
                >
                  {node.levelName}
                </Badge>
                
                {node.employee.department_name && (
                  <p className={`text-sm mb-1 ${
                    isOwner || node.level === 1 ? 'text-gray-200' : 'text-gray-600'
                  }`}>
                    {node.employee.department_name}
                  </p>
                )}
                
                <p className={`text-xs ${
                  isOwner || node.level === 1 ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {node.employee.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Line */}
        {node.children.length > 0 && (
          <div className="w-0.5 h-8 bg-gray-300 my-2"></div>
        )}

        {/* Children */}
        {node.children.length > 0 && (
          <div className="flex flex-wrap justify-center gap-12">
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                {renderNode(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading organizational structure...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizational Structure
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[50px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search employees by name, email, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div 
          ref={containerRef}
          className="overflow-auto max-h-[800px] p-4"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
        >
          {/* Organization Header */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 inline-block shadow-lg">
              <div className="flex items-center justify-center gap-3">
                <Building2 className="h-8 w-8" />
                <h2 className="text-2xl font-bold">{buildHierarchy.organizationName}</h2>
              </div>
            </div>
            {filteredNodes.length > 0 && (
              <div className="w-0.5 h-8 bg-gray-300 mx-auto mt-4"></div>
            )}
          </div>

          {filteredNodes.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-12">
              {filteredNodes.map(node => renderNode(node))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No results found for your search.' : 'No employees found.'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
