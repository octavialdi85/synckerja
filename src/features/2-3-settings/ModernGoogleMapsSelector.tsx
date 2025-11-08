import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { MapPin, Search, Loader2, AlertCircle, Navigation, CheckCircle, Plus, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/features/ui/alert';
import { useToast } from '@/features/ui/use-toast';
import { useGoogleMapsLoader } from '@/features/2-3-settings/hooks/useGoogleMapsLoader';

interface LocationData {
  address: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  google_place_id?: string;
}

interface ModernGoogleMapsSelectorProps {
  onLocationSelect: (location: LocationData) => void;
  initialCenter?: { lat: number; lng: number };
  height?: string;
  showAddButton?: boolean;
}

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
}

export const ModernGoogleMapsSelector = ({
  onLocationSelect,
  initialCenter = { lat: -6.2088, lng: 106.8456 },
  height = "400px",
  showAddButton = true
}: ModernGoogleMapsSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  
  const { isLoaded, reload, error: googleMapsError } = useGoogleMapsLoader();
  const { toast } = useToast();

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return;

    try {
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapRef.current = map;
      geocoderRef.current = new window.google.maps.Geocoder();
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);

      // Add click listener to map
      map.addListener('click', handleMapClick);

      console.log('🗺️ Google Maps initialized');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Map initialization error');
      console.error('❌ Map initialization error:', error);
      setError(error.message);
      toast({
        title: "Error Peta",
        description: "Gagal memuat peta. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  }, [isLoaded, initialCenter, toast]);

  // Update marker position - use regular Marker instead of AdvancedMarkerElement
  const updateMarkerPosition = useCallback((latLng: google.maps.LatLng, shouldPan: boolean = false) => {
    if (!mapRef.current) return;

    // Clear existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    // Create new marker using regular Marker
    markerRef.current = new window.google.maps.Marker({
      map: mapRef.current,
      position: latLng,
      title: 'Lokasi Terpilih',
      animation: window.google.maps.Animation.DROP,
    });

    if (shouldPan) {
      mapRef.current.panTo(latLng);
    }
  }, []);

  // Get autocomplete suggestions
  const getAutocompleteSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || !autocompleteServiceRef.current) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteServiceRef.current!.getPlacePredictions(
          {
            input: input,
            componentRestrictions: { country: 'ID' },
            types: ['establishment', 'geocode'],
          },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              reject(new Error(`Autocomplete failed: ${status}`));
            }
          }
        );
      });

      const formattedSuggestions: PlaceSuggestion[] = results.slice(0, 5).map(prediction => ({
        place_id: prediction.place_id,
        description: prediction.description,
        structured_formatting: prediction.structured_formatting,
      }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.warn('⚠️ Autocomplete error:', error);
      setSuggestions([]);
    }
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(async (suggestion: PlaceSuggestion) => {
    if (!placesServiceRef.current) return;

    setSearchQuery(suggestion.structured_formatting.main_text);
    setShowSuggestions(false);
    setSuggestions([]);
    setIsSearching(true);

    try {
      const placeDetails = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesServiceRef.current!.getDetails(
          {
            placeId: suggestion.place_id,
            fields: ['name', 'formatted_address', 'geometry', 'place_id'],
          },
          (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(new Error(`Place details failed: ${status}`));
            }
          }
        );
      });

      if (!placeDetails.geometry?.location) {
        throw new Error('Location data not available');
      }

      const lat = placeDetails.geometry.location.lat();
      const lng = placeDetails.geometry.location.lng();
      const latLng = new window.google.maps.LatLng(lat, lng);

      console.log('📍 Selected place:', placeDetails.name, 'at', lat, lng);

      // Clear any existing selection first
      setSelectedLocation(null);
      
      // Update marker position
      updateMarkerPosition(latLng, true);

      // Create location data
      const location: LocationData = {
        address: placeDetails.name || placeDetails.formatted_address || suggestion.description,
        formatted_address: placeDetails.formatted_address || `${lat}, ${lng}`,
        latitude: lat,
        longitude: lng,
        google_place_id: placeDetails.place_id || suggestion.place_id
      };

      // Set as selected location
      setSelectedLocation(location);
      onLocationSelect(location);

      // Move map to location
      if (mapRef.current) {
        mapRef.current.setCenter(latLng);
        mapRef.current.setZoom(17);
      }

      toast({
        title: "Lokasi Dipilih",
        description: `Berhasil memilih: ${location.address}`,
      });

    } catch (error) {
      console.error('❌ Place selection error:', error);
      toast({
        title: "Error",
        description: "Gagal memilih lokasi. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [onLocationSelect, toast, updateMarkerPosition]);

  // Enhanced search with Enter key support
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !isLoaded || !window.google || !placesServiceRef.current) {
      toast({
        title: "Error",
        description: "Masukkan alamat yang valid untuk pencarian.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setError(null);
    setShowSuggestions(false);

    try {
      console.log('🔍 Searching for:', searchQuery);
      
      const service = new window.google.maps.places.PlacesService(mapRef.current!);
      
      const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
        service.textSearch(
          {
            query: searchQuery,
            location: initialCenter,
            radius: 50000, // 50km radius
            language: 'id',
            region: 'ID'
          },
          (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error(`Places search failed: ${status}`));
            }
          }
        );
      });

      if (results.length === 0) {
        toast({
          title: "Tidak Ditemukan",
          description: "Lokasi tidak ditemukan. Coba kata kunci lain.",
          variant: "destructive",
        });
        return;
      }

      // Get the best (first) result only
      const bestPlace = results[0];
      
      if (!bestPlace.geometry?.location) {
        throw new Error('Location data not available');
      }

      const lat = bestPlace.geometry.location.lat();
      const lng = bestPlace.geometry.location.lng();
      const latLng = new window.google.maps.LatLng(lat, lng);

      console.log('📍 Best search result:', bestPlace.name, 'at', lat, lng);

      // Clear any existing selection first
      setSelectedLocation(null);
      
      // Update marker position
      updateMarkerPosition(latLng, true);

      // Create location data from search result
      const location: LocationData = {
        address: bestPlace.name || bestPlace.formatted_address || searchQuery,
        formatted_address: bestPlace.formatted_address || `${lat}, ${lng}`,
        latitude: lat,
        longitude: lng,
        google_place_id: bestPlace.place_id || ''
      };

      // Set as selected location
      setSelectedLocation(location);
      onLocationSelect(location);

      // Update search query to show selected location
      setSearchQuery(location.address);

      // Move map to location with appropriate zoom
      if (mapRef.current) {
        mapRef.current.setCenter(latLng);
        mapRef.current.setZoom(17);
      }

      toast({
        title: "Lokasi Ditemukan",
        description: `Berhasil menemukan: ${location.address}`,
      });

    } catch (error) {
      console.error('❌ Search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
      toast({
        title: "Error Pencarian",
        description: "Gagal mencari lokasi. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, isLoaded, initialCenter, onLocationSelect, toast]);

  // Handle input change with debounced autocomplete
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear suggestions if input is empty
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce autocomplete
    const timeoutId = setTimeout(() => {
      getAutocompleteSuggestions(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [getAutocompleteSuggestions]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedLocation(null);
    
    // Clear marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, []);

  // Handle Enter key press in search input
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      handleSearch();
    }
  }, [handleSearch]);

  // Handle map click
  const handleMapClick = useCallback(async (event: google.maps.MapMouseEvent) => {
    if (!event.latLng || !isLoaded) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    const latLng = event.latLng;

    console.log('🗺️ Map clicked at:', lat, lng);

    // Clear search query and suggestions when clicking on map
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Clear any existing selection first
    setSelectedLocation(null);
    
    // Update marker immediately
    updateMarkerPosition(latLng, true);

    // Perform reverse geocoding for address
    try {
      if (!geocoderRef.current) {
        throw new Error('Geocoder not available');
      }

      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoderRef.current!.geocode(
          { location: latLng }, 
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          }
        );
      });

      const bestResult = results[0];

      const location: LocationData = {
        address: bestResult.formatted_address,
        formatted_address: bestResult.formatted_address,
        latitude: lat,
        longitude: lng,
        google_place_id: bestResult.place_id || ''
      };

      setSelectedLocation(location);
      onLocationSelect(location);

      toast({
        title: "Lokasi Dipilih",
        description: `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });

    } catch (error) {
      console.warn('⚠️ Geocoding failed, using basic location:', error);
      
      const location: LocationData = {
        address: `Lokasi (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
        formatted_address: `${lat}, ${lng}`,
        latitude: lat,
        longitude: lng,
        google_place_id: ''
      };

      setSelectedLocation(location);
      onLocationSelect(location);

      toast({
        title: "Lokasi Dipilih",
        description: `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });
    }
  }, [isLoaded, onLocationSelect, toast, updateMarkerPosition]);

  // Get current GPS location with high accuracy
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation tidak didukung oleh browser ini.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          const latLng = new window.google.maps.LatLng(lat, lng);

          console.log('📍 GPS location:', lat, lng, 'accuracy:', accuracy, 'meters');

          // Clear search query when using GPS
          setSearchQuery('');
          
          // Clear any existing selection first
          setSelectedLocation(null);
          
          // Update marker position
          updateMarkerPosition(latLng, true);

          // Perform reverse geocoding for better accuracy
          try {
            if (!geocoderRef.current) {
              throw new Error('Geocoder not available');
            }

            const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoderRef.current!.geocode(
                { location: latLng }, 
                (results, status) => {
                  if (status === 'OK' && results && results.length > 0) {
                    resolve(results);
                  } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                  }
                }
              );
            });

            // Use the first (most accurate) result from geocoding
            const bestResult = results[0];

            const location: LocationData = {
              address: bestResult.formatted_address,
              formatted_address: bestResult.formatted_address,
              latitude: lat,
              longitude: lng,
              google_place_id: bestResult.place_id || ''
            };

            setSelectedLocation(location);
            onLocationSelect(location);

            // Move map to GPS location with high zoom
            if (mapRef.current) {
              mapRef.current.setCenter(latLng);
              mapRef.current.setZoom(18);
            }

            toast({
              title: "Lokasi GPS Ditemukan",
              description: `Akurasi: ±${Math.round(accuracy)}m - ${location.address}`,
            });

          } catch (error) {
            console.warn('⚠️ Geocoding failed, using basic location:', error);
            
            // Fallback to basic coordinates
            const location: LocationData = {
              address: `Lokasi Saat Ini (${lat.toFixed(6)}, ${lng.toFixed(6)})`,
              formatted_address: `${lat}, ${lng}`,
              latitude: lat,
              longitude: lng,
              google_place_id: ''
            };

            setSelectedLocation(location);
            onLocationSelect(location);

            // Move map to GPS location with high zoom
            if (mapRef.current) {
              mapRef.current.setCenter(latLng);
              mapRef.current.setZoom(18);
            }

            toast({
              title: "Lokasi GPS Ditemukan",
              description: `Akurasi: ±${Math.round(accuracy)}m`,
            });
          }

        } catch (error) {
          console.error('❌ GPS processing error:', error);
          toast({
            title: "Error GPS",
            description: "Gagal memproses lokasi GPS.",
            variant: "destructive",
          });
        } finally {
          setIsSearching(false);
        }
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setIsSearching(false);
        
        let errorMessage = "Gagal mendapatkan lokasi saat ini.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Izin akses lokasi ditolak. Silakan aktifkan izin lokasi.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informasi lokasi tidak tersedia.";
            break;
          case error.TIMEOUT:
            errorMessage = "Timeout mendapatkan lokasi. Silakan coba lagi.";
            break;
        }
        
        toast({
          title: "Error GPS",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }, [onLocationSelect, toast, updateMarkerPosition]);

  useEffect(() => {
    if (isLoaded) {
      initializeMap();
    }
  }, [isLoaded, initializeMap]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Pilih Lokasi dengan Google Maps
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {/* Search Input with Autocomplete */}
        <div className="space-y-2">
          <Label htmlFor="search">Cari Alamat</Label>
          <div className="search-container relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Ketik alamat dan tekan Enter..."
                  className="pl-10 pr-10"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onKeyPress={handleSearchKeyPress}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  disabled={isSearching || !isLoaded}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                    title="Hapus pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={isSearching || !isLoaded || !searchQuery.trim()}
                title="Cari lokasi"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={isSearching || !isLoaded}
                title="Gunakan lokasi saat ini"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-12 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="font-medium text-gray-900">
                      {suggestion.structured_formatting.main_text}
                    </div>
                    {suggestion.structured_formatting.secondary_text && (
                      <div className="text-sm text-gray-500 mt-1">
                        {suggestion.structured_formatting.secondary_text}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Map Container */}
        <div className="space-y-2">
          <Label>Peta Interaktif</Label>
          <div 
            ref={mapContainerRef}
            className="w-full border rounded-lg bg-gray-100 relative overflow-hidden"
            style={{ height }}
          >
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Memuat Google Maps...</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Gunakan kotak pencarian di atas atau klik langsung pada peta untuk memilih lokasi
          </p>
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-900 mb-1 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Lokasi Terpilih:
            </h4>
            <p className="text-sm text-green-800 font-medium">{selectedLocation.address}</p>
            <p className="text-xs text-green-600 mt-1">{selectedLocation.formatted_address}</p>
            {selectedLocation.latitude !== 0 && selectedLocation.longitude !== 0 && (
              <p className="text-xs text-green-600 mt-1">
                Koordinat: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </p>
            )}
            {selectedLocation.google_place_id && (
              <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Terverifikasi Google Maps
              </p>
            )}
          </div>
        )}

        {/* Add Location Button */}
        {showAddButton && selectedLocation && (
          <div className="flex justify-end">
            <Button 
              onClick={() => onLocationSelect(selectedLocation)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Gunakan Lokasi Ini
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
