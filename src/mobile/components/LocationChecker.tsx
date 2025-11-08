import { MapPin, Navigation, Clock, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/mobile/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LocationCheckerProps {
  officeLocation?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
}

export const LocationChecker = ({ officeLocation }: LocationCheckerProps) => {
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isInOfficeArea, setIsInOfficeArea] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [nearestOffice, setNearestOffice] = useState<any>(null);
  const { toast } = useToast();

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const findNearestOffice = async (userLat: number, userLng: number) => {
    try {
      // Get current user and employee data based on active organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's active organization from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.active_organization_id) return null;

      // Get all active office locations for the organization
      const { data: offices } = await supabase
        .from('office_locations')
        .select('*')
        .eq('organization_id', profile.active_organization_id)
        .eq('is_active', true);

      if (!offices || offices.length === 0) return null;

      // Calculate distance to each office and find the nearest
      let nearestOffice = null;
      let minDistance = Infinity;

      for (const office of offices) {
        const dist = calculateDistance(
          userLat,
          userLng,
          office.latitude,
          office.longitude
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestOffice = {
            ...office,
            distance: Math.round(dist)
          };
        }
      }

      return nearestOffice;
    } catch (error) {
      console.error('Error finding nearest office:', error);
      return null;
    }
  };

  const checkLocation = async () => {
    setIsCheckingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setCurrentLocation({ lat: userLat, lng: userLng });
          
          // Find nearest office
          const nearest = await findNearestOffice(userLat, userLng);
          
          if (nearest) {
            setNearestOffice(nearest);
            setDistance(nearest.distance);
            const inArea = nearest.distance <= nearest.radius_meters;
            setIsInOfficeArea(inArea);
            
            setIsCheckingLocation(false);
            
            toast({
              title: inArea ? "Lokasi Valid" : "Di luar Area Kantor",
              description: inArea
                ? `Anda berada di area ${nearest.name} (${nearest.distance}m dari kantor)`
                : `Kantor terdekat: ${nearest.name} - ${nearest.distance}m. Radius maksimal: ${nearest.radius_meters}m`,
              variant: inArea ? "default" : "destructive",
              duration: 4000,
            });
          } else {
            setIsCheckingLocation(false);
            toast({
              title: "Error",
              description: "Tidak dapat menemukan data kantor",
              variant: "destructive",
              duration: 4000,
            });
          }
        },
        (error) => {
          setIsCheckingLocation(false);
          toast({
            title: "Error Lokasi",
            description: "Tidak dapat mengakses lokasi. Pastikan GPS aktif dan izin lokasi diberikan.",
            variant: "destructive",
            duration: 5000,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setIsCheckingLocation(false);
      toast({
        title: "GPS Tidak Didukung",
        description: "Browser tidak mendukung geolokasi",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const displayOffice = nearestOffice || officeLocation;

  return (
    <div className="px-3 mt-1">
      {/* Office Info */}
      {displayOffice && (
        <div className="bg-card rounded-lg p-4 mb-4 border border-border">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">{displayOffice.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{displayOffice.address}</p>
              <p className="text-xs text-muted-foreground">
                Radius absensi: {displayOffice.radius_meters || displayOffice.radius}m dari kantor
              </p>
            </div>
          </div>
        </div>
      )}

      {currentLocation && nearestOffice && (
        <div className="bg-card rounded-lg p-3 mb-4 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isInOfficeArea ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <Navigation className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isInOfficeArea ? `Dalam Area ${nearestOffice.name}` : `Diluar Area Kantor`}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {distance}m dari kantor
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Separate component for the location button
export const LocationButton = ({ officeLocation }: LocationCheckerProps) => {
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isInOfficeArea, setIsInOfficeArea] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [nearestOffice, setNearestOffice] = useState<any>(null);
  const { toast } = useToast();

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const findNearestOffice = async (userLat: number, userLng: number) => {
    try {
      // Get current user and employee data based on active organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's active organization from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.active_organization_id) return null;

      // Get all active office locations for the organization
      const { data: offices } = await supabase
        .from('office_locations')
        .select('*')
        .eq('organization_id', profile.active_organization_id)
        .eq('is_active', true);

      if (!offices || offices.length === 0) return null;

      // Calculate distance to each office and find the nearest
      let nearestOffice = null;
      let minDistance = Infinity;

      for (const office of offices) {
        const dist = calculateDistance(
          userLat,
          userLng,
          office.latitude,
          office.longitude
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestOffice = {
            ...office,
            distance: Math.round(dist)
          };
        }
      }

      return nearestOffice;
    } catch (error) {
      console.error('Error finding nearest office:', error);
      return null;
    }
  };

  const checkLocation = async () => {
    setIsCheckingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setCurrentLocation({ lat: userLat, lng: userLng });
          
          // Find nearest office
          const nearest = await findNearestOffice(userLat, userLng);
          
          if (nearest) {
            setNearestOffice(nearest);
            setDistance(nearest.distance);
            const inArea = nearest.distance <= nearest.radius_meters;
            setIsInOfficeArea(inArea);
            
            setIsCheckingLocation(false);
            
            toast({
              title: inArea ? "Lokasi Valid" : "Di luar Area Kantor",
              description: inArea
                ? `Anda berada di area ${nearest.name} (${nearest.distance}m dari kantor)`
                : `Kantor terdekat: ${nearest.name} - ${nearest.distance}m. Radius maksimal: ${nearest.radius_meters}m`,
              variant: inArea ? "default" : "destructive",
              duration: 4000,
            });
          } else {
            setIsCheckingLocation(false);
            toast({
              title: "Error",
              description: "Tidak dapat menemukan data kantor",
              variant: "destructive",
              duration: 4000,
            });
          }
        },
        (error) => {
          setIsCheckingLocation(false);
          toast({
            title: "Error Lokasi",
            description: "Tidak dapat mengakses lokasi. Pastikan GPS aktif dan izin lokasi diberikan.",
            variant: "destructive",
            duration: 5000,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setIsCheckingLocation(false);
      toast({
        title: "GPS Tidak Didukung",
        description: "Browser tidak mendukung geolokasi",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  return (
    <div className="flex flex-col items-center py-2">
      <button
        onClick={checkLocation}
        disabled={isCheckingLocation}
        className={`relative p-6 rounded-full transition-all duration-300 ${
          isCheckingLocation 
            ? 'bg-primary/20 scale-110' 
            : isInOfficeArea
            ? 'bg-success/20 hover:bg-success/30'
            : 'bg-card hover:bg-muted active:scale-95'
        } shadow-floating border border-border`}
      >
        {isInOfficeArea ? (
          <CheckCircle2 
            className={`h-16 w-16 transition-all duration-300 ${
              isCheckingLocation 
                ? 'text-primary animate-pulse' 
                : 'text-success'
            }`} 
          />
        ) : (
          <MapPin 
            className={`h-16 w-16 transition-all duration-300 ${
              isCheckingLocation 
                ? 'text-primary animate-pulse' 
                : 'text-muted-foreground'
            }`} 
          />
        )}
        
        {isCheckingLocation && (
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        )}
      </button>
      
      <p className="text-sm text-muted-foreground mt-2 text-center">
        {isCheckingLocation 
          ? 'Mengecek lokasi...' 
          : isInOfficeArea
          ? 'Tap untuk cek lokasi'
          : 'Tap untuk cek lokasi'}
      </p>
    </div>
  );
};