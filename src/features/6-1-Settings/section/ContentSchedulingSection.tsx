import React, { useState, useEffect } from 'react';
import { Button } from '@/features/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useServiceRequiredPlatforms, ServiceRequiredPlatform } from '@/features/6-1-dashboard/hook/useServiceRequiredPlatforms';
import { useMasterData } from '@/features/6-1-dashboard/hook/useMasterData';
import { ServiceRequiredPlatformsModal } from '../modal/ServiceRequiredPlatformsModal';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

interface Service {
  id: string;
  name: string;
}

export const ContentSchedulingSection: React.FC = () => {
  const { organizationId } = useCurrentOrg();
  const { fetchData: fetchServices } = useMasterData('services');
  const { requiredPlatforms, isLoading, canManage, deleteRequiredPlatform } = useServiceRequiredPlatforms();
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<ServiceRequiredPlatform | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Load services
  useEffect(() => {
    const loadServices = async () => {
      if (organizationId) {
        const data = await fetchServices();
        setServices(data as Service[]);
      }
    };
    loadServices();
  }, [organizationId, fetchServices]);

  // Group required platforms by service
  const platformsByService = services.reduce((acc, service) => {
    const platforms = requiredPlatforms.filter(
      rp => rp.service_id === service.id && rp.is_active === true
    );
    if (platforms.length > 0 || canManage) {
      acc[service.id] = platforms;
    }
    return acc;
  }, {} as Record<string, ServiceRequiredPlatform[]>);

  const handleAdd = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setEditingPlatform(null);
    setIsModalOpen(true);
  };

  const handleEdit = (platform: ServiceRequiredPlatform) => {
    setSelectedServiceId(platform.service_id);
    setEditingPlatform(platform);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this required platform?')) {
      deleteRequiredPlatform(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPlatform(null);
    setSelectedServiceId(null);
  };

  const getPlatformDisplayName = (platform: ServiceRequiredPlatform): string => {
    if (platform.social_media_name) {
      return `${platform.platform} - ${platform.social_media_name.name}`;
    }
    return `${platform.platform} - ${platform.custom_platform_name || 'Custom'}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading required platforms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Service Required Platforms</h3>
          <p className="text-sm text-muted-foreground">
            Configure required platforms for each service. Plans will only be marked as done when all required platforms have links filled.
          </p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No services found. Please create services first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {services.map((service) => {
            const platforms = platformsByService[service.id] || [];
            return (
              <div key={service.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-base">{service.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {platforms.length} required platform{platforms.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      onClick={() => handleAdd(service.id)}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Platform
                    </Button>
                  )}
                </div>

                {platforms.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>Social Media Name</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platforms.map((platform) => (
                        <TableRow key={platform.id}>
                          <TableCell className="font-medium">
                            {platform.platform}
                          </TableCell>
                          <TableCell>
                            {platform.social_media_name ? (
                              <Badge variant="outline">
                                {platform.social_media_name.name}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {platform.custom_platform_name || 'Custom'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={platform.is_active ? 'default' : 'secondary'}>
                              {platform.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(platform)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(platform.id)}
                                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No required platforms configured for this service.</p>
                    {canManage && (
                      <Button
                        onClick={() => handleAdd(service.id)}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Platform
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ServiceRequiredPlatformsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        serviceId={selectedServiceId}
        editingPlatform={editingPlatform}
      />
    </div>
  );
};

