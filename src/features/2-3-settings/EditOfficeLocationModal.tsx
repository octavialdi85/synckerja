
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Switch } from '@/features/ui/switch';
import { useToast } from '@/features/ui/use-toast';
import { useClients, useLocationTypes } from '@/features/2-3-settings/hooks/useLocationManagement';
import { supabase } from '@/integrations/supabase/client';

interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  google_place_id?: string;
  formatted_address?: string;
  contact_person?: string;
  contact_phone?: string;
  notes?: string;
  location_type_id?: string;
  client_id?: string;
  is_client_location: boolean;
  planned_start_time?: string;
  planned_end_time?: string;
}

interface EditOfficeLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: OfficeLocation | null;
  onLocationUpdated: () => void;
}

export const EditOfficeLocationModal: React.FC<EditOfficeLocationModalProps> = ({
  open,
  onOpenChange,
  location,
  onLocationUpdated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    contact_person: '',
    contact_phone: '',
    notes: '',
    location_type_id: '',
    client_id: '',
    is_client_location: false,
    planned_start_time: '',
    planned_end_time: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { locationTypes } = useLocationTypes();
  const { clients } = useClients();

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        address: location.address || '',
        latitude: location.latitude || 0,
        longitude: location.longitude || 0,
        radius_meters: location.radius_meters || 100,
        contact_person: location.contact_person || '',
        contact_phone: location.contact_phone || '',
        notes: location.notes || '',
        location_type_id: location.location_type_id || '',
        client_id: location.client_id || '',
        is_client_location: location.is_client_location || false,
        planned_start_time: location.planned_start_time || '',
        planned_end_time: location.planned_end_time || ''
      });
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('office_locations')
        .update({
          name: formData.name,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          radius_meters: formData.radius_meters,
          contact_person: formData.contact_person || null,
          contact_phone: formData.contact_phone || null,
          notes: formData.notes || null,
          location_type_id: formData.location_type_id || null,
          client_id: formData.is_client_location ? formData.client_id || null : null,
          is_client_location: formData.is_client_location,
          planned_start_time: formData.is_client_location ? formData.planned_start_time || null : null,
          planned_end_time: formData.is_client_location ? formData.planned_end_time || null : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', location.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Office location updated successfully"
      });

      onLocationUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating office location:', error);
      toast({
        title: "Error",
        description: "Failed to update office location",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Office Location</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_type">Location Type</Label>
              <Select
                value={formData.location_type_id}
                onValueChange={(value) => handleInputChange('location_type_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="radius">Radius (meters) *</Label>
              <Input
                id="radius"
                type="number"
                min="1"
                value={formData.radius_meters}
                onChange={(e) => handleInputChange('radius_meters', parseInt(e.target.value) || 100)}
                required
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_client_location"
              checked={formData.is_client_location}
              onCheckedChange={(checked) => handleInputChange('is_client_location', checked)}
            />
            <Label htmlFor="is_client_location">This is a client location</Label>
          </div>

          {formData.is_client_location && (
            <>
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleInputChange('client_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planned_start_time">Plan Start Time</Label>
                  <Input
                    id="planned_start_time"
                    type="time"
                    value={formData.planned_start_time}
                    onChange={(e) => handleInputChange('planned_start_time', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planned_end_time">Plan End Time</Label>
                  <Input
                    id="planned_end_time"
                    type="time"
                    value={formData.planned_end_time}
                    onChange={(e) => handleInputChange('planned_end_time', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
