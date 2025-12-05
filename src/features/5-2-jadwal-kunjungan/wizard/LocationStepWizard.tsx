import { MapPin, Compass, CheckCircle } from 'lucide-react';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { GoogleMapsLocationSelector } from '@/features/2-3-settings/GoogleMapsLocationSelector';

interface LocationData {
  address: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  google_place_id?: string;
}

interface VisitData {
  selectedLocation: LocationData | null;
  locationName: string;
  locationType: string;
  radius: string;
  clientName: string;
  contactPerson: string;
  phoneNumber: string;
  salesPerson: string;
  plannedStartTime: string;
  plannedEndTime: string;
  visitPurpose: string;
  notes: string;
}

interface LocationStepWizardProps {
  visitData: VisitData;
  updateVisitData: (data: Partial<VisitData>) => void;
}

export const LocationStepWizard = ({ visitData, updateVisitData }: LocationStepWizardProps) => {
  const handleLocationSelect = (location: LocationData) => {
    updateVisitData({ 
      selectedLocation: location,
      locationName: location.formatted_address 
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Compass className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Pilih Lokasi Kunjungan</h3>
            <p className="text-blue-700 text-sm">
              Gunakan peta di bawah untuk memilih lokasi yang tepat, atau masukkan alamat secara manual.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Peta Interaktif
          </h3>
          
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <GoogleMapsLocationSelector 
              onLocationSelect={handleLocationSelect} 
              initialCenter={{
                lat: -6.2088,
                lng: 106.8456
              }} 
              height="350px" 
              showAddButton={false} 
            />
          </div>
        </div>

        {/* Form Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Detail Lokasi</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="location-name" className="text-sm font-medium text-slate-700">
                Nama Lokasi *
              </Label>
              <Input 
                id="location-name" 
                value={visitData.locationName} 
                onChange={e => updateVisitData({ locationName: e.target.value })} 
                className="mt-1"
                placeholder="Masukkan nama lokasi"
              />
            </div>

            <div>
              <Label htmlFor="location-type" className="text-sm font-medium text-slate-700">
                Tipe Lokasi
              </Label>
              <Select 
                value={visitData.locationType} 
                onValueChange={value => updateVisitData({ locationType: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client-site">Client Site</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="meeting-point">Meeting Point</SelectItem>
                  <SelectItem value="public-space">Public Space</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="radius" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Radius Toleransi (meter)
              </Label>
              <Input 
                id="radius" 
                type="number" 
                min="10" 
                max="5000" 
                step="10" 
                value={visitData.radius} 
                onChange={e => updateVisitData({ radius: e.target.value })} 
                className="mt-1"
                placeholder="100"
              />
              <p className="text-xs text-slate-500 mt-1">
                Jarak toleransi dari lokasi (10-5000 meter)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Location Status */}
      {(visitData.selectedLocation || visitData.locationName) && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-800 mb-1">Lokasi Siap</h4>
              <p className="text-green-700 text-sm">
                {visitData.selectedLocation 
                  ? visitData.selectedLocation.formatted_address 
                  : visitData.locationName
                }
              </p>
              {visitData.selectedLocation && (
                <p className="text-xs text-green-600 mt-1 font-mono">
                  {visitData.selectedLocation.latitude.toFixed(6)}, {visitData.selectedLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
