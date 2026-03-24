import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Hand, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import {
  OrganizationalDiagram,
  type OrganizationalDiagramHandle,
} from './organization/OrganizationalDiagram';
import { OrganizationStatistics } from './organization/OrganizationStatistics';
import { useOrganizationalStructure } from './hooks/useOrganizationalStructure';
import { Skeleton } from '@/features/ui/skeleton';
import { Card, CardContent } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { HeaderAndTab } from './HeaderAndTab';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const CompanyOrganizationPage = () => {
  const [activeTab, setActiveTab] = useState('organization');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const diagramRef = useRef<OrganizationalDiagramHandle>(null);
  const navigate = useNavigate();
  const { t } = useAppTranslation();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const { statistics, isLoading } = useOrganizationalStructure();

  const handleEmployeeClick = (employeeId: string) => {
    navigate(`/my-info/personal?id=${employeeId}`);
  };

  const zoomOut = useCallback(() => {
    setZoomLevel((z) => Math.max(0.5, z - 0.1));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((z) => Math.min(2, z + 0.1));
  }, []);

  const sidebarTools = (
    <div className="shrink-0 space-y-3 border-b border-gray-100 pb-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Building2 className="h-4 w-4 shrink-0 text-gray-600" aria-hidden />
        {t('organization.diagram.title', 'Organizational structure')}
      </h2>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t(
            'organization.diagram.searchPlaceholder',
            'Search by name, email, or position…'
          )}
          className="pl-10 text-sm"
          aria-label={t('organization.diagram.searchPlaceholder', 'Search by name, email, or position…')}
        />
      </div>
      <p className="flex items-start gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-2 py-2 text-xs leading-snug text-muted-foreground">
        <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{t('organization.diagram.panHint', 'Drag empty area to pan the chart (hand cursor).')}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => diagramRef.current?.resetView()}
          title={t('organization.diagram.resetView', 'Reset position and zoom')}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="min-w-[48px] text-center text-sm font-medium tabular-nums text-gray-700">
          {Math.round(zoomLevel * 100)}%
        </span>
        <Button type="button" variant="outline" size="sm" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="relative flex h-screen flex-col bg-gray-100 font-sans">
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            <div className="flex h-full flex-col">
              <div className="mb-1 flex-shrink-0">
                <HeaderAndTab activeTab={activeTab} onTabChange={handleTabChange} />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="flex h-full min-h-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:gap-4">
                  <div className="flex min-h-[240px] min-w-0 flex-1 flex-col lg:flex-[8]">
                    <Card className="flex min-h-0 flex-1 flex-col border-gray-200 shadow-sm">
                      <CardContent className="flex flex-1 flex-col p-4">
                        <div className="flex flex-1 flex-col justify-center space-y-3 pt-4">
                          <Skeleton className="h-16 w-40 rounded-lg self-center" />
                          <div className="flex justify-center gap-3">
                            <Skeleton className="h-12 w-32 rounded-lg" />
                            <Skeleton className="h-12 w-32 rounded-lg" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-auto lg:min-h-0 lg:flex-[2] lg:border-l lg:border-gray-100 lg:pl-4">
                    <div className="shrink-0 space-y-2 border-b border-gray-100 pb-3">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-9 w-9" />
                        <Skeleton className="h-9 w-9" />
                        <Skeleton className="h-9 w-12" />
                        <Skeleton className="h-9 w-9" />
                      </div>
                    </div>
                    {Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <Card key={i} className="shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-8 w-8 rounded-lg" />
                              <div className="space-y-1">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-10" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col bg-gray-100 font-sans">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="flex h-full flex-col">
            <div className="mb-1 flex-shrink-0">
              <HeaderAndTab activeTab={activeTab} onTabChange={handleTabChange} />
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full min-h-0 flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:gap-4">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-[8]">
                  <OrganizationalDiagram
                    ref={diagramRef}
                    onEmployeeClick={handleEmployeeClick}
                    searchTerm={searchTerm}
                    zoomLevel={zoomLevel}
                    onZoomLevelChange={setZoomLevel}
                  />
                </div>
                <aside className="seamless-scroll flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-gray-200 lg:w-auto lg:min-h-0 lg:flex-[2] lg:border-l lg:pl-4">
                  {sidebarTools}
                  <OrganizationStatistics statistics={statistics} />
                </aside>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
