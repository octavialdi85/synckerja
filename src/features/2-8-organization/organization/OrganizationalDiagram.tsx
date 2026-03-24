
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
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Alert, AlertDescription, AlertTitle } from '@/features/ui/alert';

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
  const { t } = useAppTranslation();

  const { data: allEmployees = [], isLoading } = useEmployees();
  const { data: currentUserEmployee } = useCurrentUserEmployee();
  const { organization, organizationName: contextOrganizationName } = useCentralizedUserData();

  // Exclude only resigned/terminated/inactive/pending removal; include active, probation, contract, etc.
  const employees = React.useMemo(
    () => allEmployees.filter(isEmployeeInOrganizationalStructure),
    [allEmployees]
  );

  const buildHierarchy = React.useMemo(() => {
    const organizationName = contextOrganizationName || organization?.company_name || 'Organization';
    if (!employees.length) {
      return {
        rootNodes: [] as HierarchyNode[],
        orphanForest: [] as HierarchyNode[],
        organizationName,
        hasOrphans: false,
        multipleRoots: false,
        noRoot: false,
      };
    }

    const childrenByManager = new Map<string, typeof employees[number][]>();
    for (const e of employees) {
      if (!e.manager_id) continue;
      const list = childrenByManager.get(e.manager_id) ?? [];
      list.push(e);
      childrenByManager.set(e.manager_id, list);
    }

    const createNode = (employee: (typeof employees)[number], depth: number): HierarchyNode => ({
      id: employee.id,
      employee,
      level: depth,
      levelName: employee.job_level_name || 'Employee',
      children: [],
    });

    const buildTree = (emp: (typeof employees)[number], depth: number): HierarchyNode => {
      const node = createNode(emp, depth);
      for (const c of childrenByManager.get(emp.id) || []) {
        node.children.push(buildTree(c, depth + 1));
      }
      return node;
    };

    const roots = employees.filter((e) => !e.manager_id);
    const multipleRoots = roots.length > 1;
    const noRoot = roots.length === 0;
    const rootNodes = roots.map((r) => buildTree(r, 0));

    const collectIds = (n: HierarchyNode, s: Set<string>) => {
      s.add(n.id);
      n.children.forEach((c) => collectIds(c, s));
    };
    const inMain = new Set<string>();
    rootNodes.forEach((n) => collectIds(n, inMain));
    const disconnected = employees.filter((e) => !inMain.has(e.id));
    const hasOrphans = disconnected.length > 0;

    const discSet = new Set(disconnected.map((d) => d.id));
    const orphanRoots = disconnected.filter((e) => !e.manager_id || !discSet.has(e.manager_id));
    const buildBounded = (emp: (typeof employees)[number], depth: number): HierarchyNode => {
      const node = createNode(emp, depth);
      for (const c of (childrenByManager.get(emp.id) || []).filter((x) => discSet.has(x.id))) {
        node.children.push(buildBounded(c, depth + 1));
      }
      return node;
    };
    const orphanForest = orphanRoots.map((r) => buildBounded(r, 0));

    return {
      rootNodes,
      orphanForest,
      organizationName,
      hasOrphans,
      multipleRoots,
      noRoot,
    };
  }, [employees, contextOrganizationName, organization]);

  const filterTree = React.useCallback(
    (nodes: HierarchyNode[]): HierarchyNode[] => {
      if (!searchTerm) return nodes;
      const q = searchTerm.toLowerCase();
      const filterNodes = (list: HierarchyNode[]): HierarchyNode[] =>
        list
          .filter((node) => {
            const matchesSearch =
              node.employee.full_name.toLowerCase().includes(q) ||
              (node.employee.email?.toLowerCase().includes(q) ?? false) ||
              node.levelName.toLowerCase().includes(q);
            const childFiltered = filterNodes(node.children);
            const hasMatchingChildren = childFiltered.length > 0;
            return matchesSearch || hasMatchingChildren;
          })
          .map((node) => ({
            ...node,
            children: filterNodes(node.children),
          }));
      return filterNodes(nodes);
    },
    [searchTerm]
  );

  const filteredRootNodes = React.useMemo(
    () => filterTree(buildHierarchy.rootNodes),
    [buildHierarchy.rootNodes, filterTree]
  );

  const filteredOrphanForest = React.useMemo(
    () => filterTree(buildHierarchy.orphanForest),
    [buildHierarchy.orphanForest, filterTree]
  );

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
            {(filteredRootNodes.length > 0 || filteredOrphanForest.length > 0) && (
              <div className="w-0.5 h-8 bg-gray-300 mx-auto mt-4"></div>
            )}
          </div>

          {buildHierarchy.noRoot && employees.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{t('organization.diagram.noRoot', 'No hierarchy root')}</AlertTitle>
              <AlertDescription>
                {t('organization.diagram.noRoot', 'No employee without a manager (root). Check manager_id data and organization owner.')}
              </AlertDescription>
            </Alert>
          )}

          {buildHierarchy.multipleRoots && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>{t('organization.diagram.multipleRoots', 'Multiple roots')}</AlertTitle>
              <AlertDescription>
                {t('organization.diagram.multipleRoots', 'Multiple roots found; only the organization owner should have no manager.')}
              </AlertDescription>
            </Alert>
          )}

          {buildHierarchy.hasOrphans && (
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <AlertTitle>{t('organization.diagram.orphanWarning', 'Hierarchy warning')}</AlertTitle>
              <AlertDescription>
                {t('organization.diagram.orphanWarning', 'Some employees are not attached to the main tree.')}
              </AlertDescription>
            </Alert>
          )}

          {filteredRootNodes.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-12">
              {filteredRootNodes.map((node) => renderNode(node))}
            </div>
          ) : filteredOrphanForest.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No results found for your search.' : 'No employees found.'}
            </div>
          ) : null}

          {filteredOrphanForest.length > 0 && (
            <div className="mt-10 pt-8 border-t border-gray-200">
              <p className="text-center text-sm font-medium text-gray-600 mb-6">
                {t('organization.diagram.orphanWarning', 'Employees outside main tree')}
              </p>
              <div className="flex flex-wrap justify-center gap-12">
                {filteredOrphanForest.map((node) => renderNode(node))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
