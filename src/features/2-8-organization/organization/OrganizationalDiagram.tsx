import React, { useState, useRef, useCallback, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent } from '@/features/ui/card';
import { Badge } from '@/features/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import { Building2, Crown } from 'lucide-react';
import { useEmployees } from '@/features/2-1-employees/hooks/useEmployees';
import { useCurrentUserEmployee } from '@/features/1-login/hooks/useCurrentUserEmployee';
import { getPhotoUrl, getInitials } from '@/features/2-1-employees/hooks/photoUtils';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';
import { isEmployeeInOrganizationalStructure } from '@/features/2-1-employees/utils/employeeUtils';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Alert, AlertDescription, AlertTitle } from '@/features/ui/alert';

export type OrganizationalDiagramHandle = {
  resetView: () => void;
};

export interface OrganizationalDiagramProps {
  onEmployeeClick?: (employeeId: string) => void;
  searchTerm: string;
  zoomLevel: number;
  onZoomLevelChange: (value: number) => void;
}

interface HierarchyNode {
  id: string;
  employee: any;
  level: number;
  levelName: string;
  children: HierarchyNode[];
}

export const OrganizationalDiagram = forwardRef<OrganizationalDiagramHandle, OrganizationalDiagramProps>(
  function OrganizationalDiagram(
    { onEmployeeClick, searchTerm, zoomLevel, onZoomLevelChange },
    ref
  ) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  zoomRef.current = zoomLevel;

  const dragActiveRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const panRafRef = useRef<number | null>(null);
  const { t } = useAppTranslation();

  const applyTransform = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    const { x, y } = panRef.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoomRef.current})`;
  }, []);

  useLayoutEffect(() => {
    if (!dragActiveRef.current) {
      panRef.current = { ...pan };
    }
    applyTransform();
  }, [pan, applyTransform]);

  useLayoutEffect(() => {
    applyTransform();
  }, [zoomLevel, applyTransform]);

  const schedulePanTransform = useCallback(() => {
    if (panRafRef.current != null) return;
    panRafRef.current = requestAnimationFrame(() => {
      panRafRef.current = null;
      applyTransform();
    });
  }, [applyTransform]);

  const handlePanePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-org-node]')) return;

    dragActiveRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      e.preventDefault();
    }
  }, []);

  const handlePanePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragActiveRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      if (dx === 0 && dy === 0) return;
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      schedulePanTransform();
    },
    [schedulePanTransform]
  );

  const endPaneDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (panRafRef.current != null) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
      applyTransform();

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }

      const wasDragging = dragActiveRef.current;
      dragActiveRef.current = false;

      if (wasDragging) {
        setPan((prev) => {
          const next = panRef.current;
          if (prev.x === next.x && prev.y === next.y) return prev;
          return { x: next.x, y: next.y };
        });
      }
    },
    [applyTransform]
  );

  const resetView = useCallback(() => {
    panRef.current = { x: 0, y: 0 };
    setPan({ x: 0, y: 0 });
    onZoomLevelChange(1);
  }, [onZoomLevelChange]);

  useImperativeHandle(ref, () => ({ resetView }), [resetView]);

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
            data-org-node
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
      <Card className="flex h-full min-h-0 flex-col border-gray-200 shadow-sm">
        <CardContent className="flex flex-1 items-center justify-center p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading organizational structure...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full min-h-0 flex-col border-gray-200 shadow-sm">
      <CardContent className="flex flex-1 min-h-0 flex-col p-0 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
        <div
          ref={viewportRef}
          role="application"
          aria-label={t('organization.diagram.panHint', 'Drag empty area to pan the chart (hand cursor).')}
          className="relative flex min-h-[280px] w-full flex-1 basis-0 cursor-grab touch-none select-none overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60 selection:bg-transparent active:cursor-grabbing dark:border-slate-700/80 dark:bg-slate-900/25"
          onPointerDown={handlePanePointerDown}
          onPointerMove={handlePanePointerMove}
          onPointerUp={endPaneDrag}
          onPointerCancel={endPaneDrag}
        >
          <div
            ref={innerRef}
            className="mx-auto w-max max-w-none origin-top p-6 will-change-transform"
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
        </div>
      </CardContent>
    </Card>
  );
});
