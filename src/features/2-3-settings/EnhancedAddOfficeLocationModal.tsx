import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/popover';
import { Separator } from '@/features/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Loader2, MapPin, Search, CheckCircle, MoreVertical, Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { InteractiveMapLocationSelector } from './InteractiveMapLocationSelector';
import { useLocationTypes, useClients } from '@/features/2-3-settings/hooks/useLocationManagement';
import { LocationTypesCRUD } from './LocationTypesCRUD';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useToast } from '@/features/ui/use-toast';
interface EnhancedAddOfficeLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationAdded?: () => void;
}
export const EnhancedAddOfficeLocationModal = ({
  open,
  onOpenChange,
  onLocationAdded
}: EnhancedAddOfficeLocationModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
    google_place_id: '',
    formatted_address: '',
    contact_person: '',
    contact_phone: '',
    notes: '',
    location_type_id: null as string | null,
    client_id: null as string | null,
    is_client_location: false,
    is_active: true,
    map_preferences: {
      zoom: 15,
      mapType: 'roadmap'
    },
    last_verified: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [showLocationTypesCRUD, setShowLocationTypesCRUD] = useState(false);
  const {
    locationTypes,
    loading: locationTypesLoading
  } = useLocationTypes();
  const {
    clients = [],
    loading: clientsLoading
  } = useClients();
  const {
    organizationId
  } = useCurrentOrg();
  const {
    toast
  } = useToast();
  const handleLocationSelect = (location: {
    address: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    google_place_id?: string;
  }) => {
    console.log('Location selected:', location);
    setFormData(prev => ({
      ...prev,
      address: location.formatted_address || location.address,
      formatted_address: location.formatted_address || location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      google_place_id: location.google_place_id || '',
      name: prev.name || location.address
    }));
    setLocationSelected(true);
  };
  const handleConfirmLocation = () => {
    if (locationSelected && formData.latitude !== 0 && formData.longitude !== 0) {
      setActiveTab('form');
      toast({
        title: "Lokasi Dikonfirmasi",
        description: "Silakan lengkapi detail lokasi pada tab berikutnya."
      });
    }
  };
  const handleManualLocationInput = () => {
    if (formData.address && formData.latitude && formData.longitude) {
      setLocationSelected(true);
      toast({
        title: "Lokasi Manual Dikonfirmasi",
        description: "Lokasi berhasil diatur secara manual."
      });
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSelected || formData.latitude === 0 || formData.longitude === 0) {
      toast({
        title: "Error",
        description: "Silakan pilih lokasi terlebih dahulu",
        variant: "destructive"
      });
      return;
    }
    if (!organizationId) {
      toast({
        title: "Error",
        description: "Organization tidak ditemukan",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "User tidak terautentikasi",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const cleanedData = {
        ...formData,
        organization_id: organizationId,
        location_type_id: formData.location_type_id && formData.location_type_id !== 'none' ? formData.location_type_id : null,
        client_id: formData.client_id && formData.client_id !== 'none' ? formData.client_id : null,
        google_place_id: formData.google_place_id || null,
        contact_person: formData.contact_person || null,
        contact_phone: formData.contact_phone || null,
        notes: formData.notes || null,
        created_by: user.id,
        planned_start_time: '09:00:00',
        planned_end_time: '17:00:00'
      };
      console.log('Submitting location data:', cleanedData);
      const {
        data,
        error
      } = await supabase.from('office_locations').insert(cleanedData).select().single();
      if (error) throw error;
      toast({
        title: "Berhasil",
        description: "Lokasi kantor berhasil ditambahkan"
      });

      // Reset form
      setFormData({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        radius_meters: 100,
        google_place_id: '',
        formatted_address: '',
        contact_person: '',
        contact_phone: '',
        notes: '',
        location_type_id: null,
        client_id: null,
        is_client_location: false,
        is_active: true,
        map_preferences: {
          zoom: 15,
          mapType: 'roadmap'
        },
        last_verified: new Date().toISOString()
      });
      setLocationSelected(false);
      setActiveTab('map');
      onLocationAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding office location:', error);
      toast({
        title: "Error",
        description: "Gagal menambahkan lokasi kantor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = () => {
    // Reset form
    setFormData({
      name: '',
      address: '',
      latitude: 0,
      longitude: 0,
      radius_meters: 100,
      google_place_id: '',
      formatted_address: '',
      contact_person: '',
      contact_phone: '',
      notes: '',
      location_type_id: null,
      client_id: null,
      is_client_location: false,
      is_active: true,
      map_preferences: {
        zoom: 15,
        mapType: 'roadmap'
      },
      last_verified: new Date().toISOString()
    });
    setLocationSelected(false);
    setActiveTab('map');
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Tambah Lokasi Kantor Baru
          </DialogTitle>
          <DialogDescription>
            Pilih lokasi menggunakan peta interaktif atau masukkan koordinat secara manual.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-2" />
              Peta Interaktif
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Search className="h-4 w-4 mr-2" />
              Input Manual
            </TabsTrigger>
            <TabsTrigger value="form" disabled={!locationSelected}>
              Detail Lokasi
              {locationSelected && <CheckCircle className="h-4 w-4 ml-2 text-green-600" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <InteractiveMapLocationSelector onLocationSelect={handleLocationSelect} showAddButton={false} />
            
            {/* Selected Location Preview and Confirmation */}
            {locationSelected && formData.latitude !== 0 && formData.longitude !== 0 && <div className="space-y-4">
                
                
                <div className="flex justify-end">
                  <Button onClick={handleConfirmLocation} className="bg-blue-600 hover:bg-blue-700">
                    Konfirmasi Lokasi & Lanjutkan
                  </Button>
                </div>
              </div>}
            
            {!locationSelected && <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-sm">
                  💡 Silakan gunakan kotak pencarian atau klik langsung pada peta untuk memilih lokasi
                </p>
              </div>}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="manual-address">Alamat Lengkap</Label>
                <Input id="manual-address" value={formData.address} onChange={e => setFormData(prev => ({
                ...prev,
                address: e.target.value
              }))} placeholder="Masukkan alamat lengkap..." />
              </div>
              <div>
                <Label htmlFor="manual-lat">Latitude</Label>
                <Input id="manual-lat" type="number" step="any" value={formData.latitude || ''} onChange={e => setFormData(prev => ({
                ...prev,
                latitude: parseFloat(e.target.value) || 0
              }))} placeholder="-6.2088" />
              </div>
              <div>
                <Label htmlFor="manual-lng">Longitude</Label>
                <Input id="manual-lng" type="number" step="any" value={formData.longitude || ''} onChange={e => setFormData(prev => ({
                ...prev,
                longitude: parseFloat(e.target.value) || 0
              }))} placeholder="106.8456" />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button onClick={handleManualLocationInput} disabled={!formData.address || !formData.latitude || !formData.longitude}>
                Konfirmasi Lokasi Manual
              </Button>
            </div>
            
            {locationSelected && <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">✓ Lokasi manual berhasil dikonfirmasi</p>
              </div>}
          </TabsContent>

          <TabsContent value="form" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Display Selected Location Summary */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Lokasi yang Dipilih:</h4>
                <p className="text-sm text-blue-800">{formData.formatted_address || formData.address}</p>
                <p className="text-xs text-blue-600">
                  Koordinat: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                </p>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nama Lokasi *</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
                  ...prev,
                  name: e.target.value
                }))} placeholder="contoh: Kantor Pusat Jakarta" required />
                </div>

                <div>
                  <Label htmlFor="location_type" className="flex items-center justify-between">
                    Tipe Lokasi
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="end">
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8"
                            onClick={() => setShowLocationTypesCRUD(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Type
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8"
                            onClick={() => setShowLocationTypesCRUD(true)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Types
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8"
                            onClick={() => setShowLocationTypesCRUD(true)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Manage All Types
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </Label>
                  <Select value={formData.location_type_id || "none"} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  location_type_id: value === "none" ? null : value
                }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak ada tipe</SelectItem>
                      {locationTypesLoading ? <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        </SelectItem> : locationTypes.length > 0 ? locationTypes.map(type => <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>) : <SelectItem value="no-data" disabled>
                          Tidak ada tipe lokasi
                        </SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="radius">Radius Absensi (meter)</Label>
                  <Input id="radius" type="number" value={formData.radius_meters} onChange={e => setFormData(prev => ({
                  ...prev,
                  radius_meters: parseInt(e.target.value) || 100
                }))} min="10" max="1000" />
                </div>

                <div>
                  <Label htmlFor="client">Klien (Opsional)</Label>
                  <Select value={formData.client_id || "none"} onValueChange={value => setFormData(prev => ({
                  ...prev,
                  client_id: value === "none" ? null : value,
                  is_client_location: value !== "none" && value !== null
                }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih klien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak ada klien</SelectItem>
                      {clientsLoading ? <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        </SelectItem> : clients.length > 0 ? clients.map(client => <SelectItem key={client.id} value={client.id}>
                            {client.company_name}
                          </SelectItem>) : <SelectItem value="no-clients" disabled>
                          Tidak ada klien tersedia
                        </SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_person">Penanggung Jawab</Label>
                  <Input id="contact_person" value={formData.contact_person || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  contact_person: e.target.value
                }))} placeholder="Nama penanggung jawab" />
                </div>

                <div>
                  <Label htmlFor="contact_phone">Nomor Telepon</Label>
                  <Input id="contact_phone" value={formData.contact_phone || ''} onChange={e => setFormData(prev => ({
                  ...prev,
                  contact_phone: e.target.value
                }))} placeholder="+62 123 456 789" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea id="notes" value={formData.notes || ''} onChange={e => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))} placeholder="Catatan tambahan tentang lokasi ini..." rows={3} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading || !locationSelected}>
                  {loading ? <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Menambahkan...
                    </> : 'Tambah Lokasi'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Location Types CRUD Modal */}
      <Dialog open={showLocationTypesCRUD} onOpenChange={setShowLocationTypesCRUD}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Location Types</DialogTitle>
          </DialogHeader>
          <LocationTypesCRUD />
        </DialogContent>
      </Dialog>
    </Dialog>;
};
