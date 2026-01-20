// ============================================================
// ATTENDING AI - Enhanced Geolocation Service
// apps/shared/services/GeolocationService.ts
//
// GPS-based emergency facility finder with real mapping APIs
// Revolutionary Feature: Instant emergency room navigation
// ============================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface EmergencyFacility {
  id: string;
  name: string;
  type: 'emergency' | 'urgent-care' | 'hospital' | 'clinic';
  address: string;
  phone: string;
  distance: number; // miles
  duration?: number; // minutes
  coordinates: Coordinates;
  openNow?: boolean;
  open24Hours?: boolean;
  waitTime?: string;
  rating?: number;
  placeId?: string;
}

export interface NurseHotline {
  name: string;
  number: string;
  description?: string;
  availability?: string;
}

export interface LocationResult {
  success: boolean;
  coordinates?: Coordinates;
  error?: string;
}

export interface FacilitySearchResult {
  success: boolean;
  facilities: EmergencyFacility[];
  userLocation?: Coordinates;
  error?: string;
}

// =============================================================================
// Haversine Distance Calculation
// =============================================================================

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

// =============================================================================
// Geolocation Service
// =============================================================================

class GeolocationServiceClass {
  private cachedLocation: Coordinates | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute

  // Get current location with caching
  async getCurrentLocation(forceRefresh = false): Promise<LocationResult> {
    // Return cached location if valid
    if (
      !forceRefresh &&
      this.cachedLocation &&
      Date.now() - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return { success: true, coordinates: this.cachedLocation };
    }

    // Check if geolocation is available
    if (!navigator.geolocation) {
      return {
        success: false,
        error: 'Geolocation is not supported by your browser',
      };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          this.cachedLocation = coordinates;
          this.cacheTimestamp = Date.now();
          
          resolve({ success: true, coordinates });
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          
          resolve({ success: false, error: errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: this.CACHE_DURATION,
        }
      );
    });
  }

  // Find nearby emergency facilities
  async findNearbyFacilities(
    type: 'emergency' | 'urgent-care' | 'all' = 'all',
    limit: number = 5,
    radiusMiles: number = 25
  ): Promise<FacilitySearchResult> {
    // Get user location first
    const locationResult = await this.getCurrentLocation();
    
    if (!locationResult.success || !locationResult.coordinates) {
      return {
        success: false,
        facilities: [],
        error: locationResult.error || 'Could not determine your location',
      };
    }

    const { latitude, longitude } = locationResult.coordinates;

    // Try Google Places API if available
    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      return this.searchWithGooglePlaces(latitude, longitude, type, limit, radiusMiles);
    }

    // Fallback to generating search URLs
    return this.generateSearchFallback(latitude, longitude, type);
  }

  // Google Places API search
  private async searchWithGooglePlaces(
    lat: number,
    lng: number,
    type: 'emergency' | 'urgent-care' | 'all',
    limit: number,
    radiusMiles: number
  ): Promise<FacilitySearchResult> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const radiusMeters = radiusMiles * 1609.34;

    const searchTypes = type === 'all' 
      ? ['hospital', 'health'] 
      : type === 'emergency' 
        ? ['hospital'] 
        : ['health'];

    const facilities: EmergencyFacility[] = [];

    for (const searchType of searchTypes) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
          `location=${lat},${lng}&radius=${radiusMeters}&type=${searchType}&` +
          `keyword=${type === 'urgent-care' ? 'urgent care' : 'emergency room'}&key=${apiKey}`
        );

        if (!response.ok) continue;

        const data = await response.json();

        if (data.results) {
          data.results.forEach((place: any) => {
            const distance = calculateDistance(
              lat, lng,
              place.geometry.location.lat,
              place.geometry.location.lng
            );

            facilities.push({
              id: place.place_id,
              name: place.name,
              type: place.types.includes('hospital') ? 'emergency' : 'urgent-care',
              address: place.vicinity || place.formatted_address,
              phone: '', // Requires Place Details API call
              distance,
              coordinates: {
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              },
              openNow: place.opening_hours?.open_now,
              rating: place.rating,
              placeId: place.place_id,
            });
          });
        }
      } catch (error) {
        console.error('[Geolocation] Google Places error:', error);
      }
    }

    // Sort by distance and limit
    facilities.sort((a, b) => a.distance - b.distance);
    
    return {
      success: true,
      facilities: facilities.slice(0, limit),
      userLocation: { latitude: lat, longitude: lng },
    };
  }

  // Fallback with search URLs
  private generateSearchFallback(
    lat: number,
    lng: number,
    type: 'emergency' | 'urgent-care' | 'all'
  ): FacilitySearchResult {
    const searchQuery = type === 'urgent-care' 
      ? 'urgent care near me' 
      : type === 'emergency'
        ? 'emergency room near me'
        : 'hospital near me';

    // Generate a helpful fallback facility with search link
    const facilities: EmergencyFacility[] = [
      {
        id: 'search-google',
        name: `Search ${type === 'urgent-care' ? 'Urgent Care' : 'Emergency Rooms'} Near You`,
        type: type === 'urgent-care' ? 'urgent-care' : 'emergency',
        address: 'Click to open Google Maps',
        phone: '',
        distance: 0,
        coordinates: { latitude: lat, longitude: lng },
      },
    ];

    return {
      success: true,
      facilities,
      userLocation: { latitude: lat, longitude: lng },
    };
  }

  // Build Google Maps directions URL
  buildDirectionsUrl(
    destination: string | Coordinates,
    travelMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): string {
    const destParam = typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.latitude},${destination.longitude}`;

    return `https://www.google.com/maps/dir/?api=1&destination=${destParam}&travelmode=${travelMode}`;
  }

  // Build Apple Maps directions URL
  buildAppleMapsUrl(
    destination: string | Coordinates,
    travelMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): string {
    const modeMap = { driving: 'd', walking: 'w', transit: 'r' };
    
    const destParam = typeof destination === 'string'
      ? encodeURIComponent(destination)
      : `${destination.latitude},${destination.longitude}`;

    return `https://maps.apple.com/?daddr=${destParam}&dirflg=${modeMap[travelMode]}`;
  }

  // Build phone call URL
  buildCallUrl(phoneNumber: string): string {
    // Clean the phone number
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    return `tel:${cleaned}`;
  }

  // Build SMS URL
  buildSmsUrl(phoneNumber: string, body?: string): string {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const bodyParam = body ? `?body=${encodeURIComponent(body)}` : '';
    return `sms:${cleaned}${bodyParam}`;
  }

  // Get emergency hotlines
  getEmergencyHotlines(): NurseHotline[] {
    return [
      {
        name: '911 Emergency',
        number: '911',
        description: 'Police, Fire, Medical Emergency',
        availability: '24/7',
      },
      {
        name: 'Suicide & Crisis Lifeline',
        number: '988',
        description: 'Mental health crisis support',
        availability: '24/7',
      },
      {
        name: 'Poison Control',
        number: '1-800-222-1222',
        description: 'Poisoning emergencies',
        availability: '24/7',
      },
      {
        name: 'Domestic Violence Hotline',
        number: '1-800-799-7233',
        description: 'Domestic abuse support',
        availability: '24/7',
      },
    ];
  }

  // Get insurance nurse lines
  getInsuranceNurseLines(): NurseHotline[] {
    return [
      { name: 'Blue Cross Blue Shield', number: '1-800-224-6792' },
      { name: 'Aetna', number: '1-800-556-1555' },
      { name: 'UnitedHealthcare', number: '1-800-901-9355' },
      { name: 'Cigna', number: '1-800-244-6224' },
      { name: 'Humana', number: '1-800-622-9529' },
      { name: 'Kaiser Permanente', number: '1-800-454-8000' },
      { name: 'Anthem', number: '1-800-224-6792' },
    ];
  }

  // Detect if on mobile device
  isMobileDevice(): boolean {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  // Get best maps app URL based on device
  getBestMapsUrl(destination: string | Coordinates): string {
    if (this.isMobileDevice() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return this.buildAppleMapsUrl(destination);
    }
    return this.buildDirectionsUrl(destination);
  }

  // Open directions in appropriate app
  openDirections(destination: string | Coordinates): void {
    const url = this.getBestMapsUrl(destination);
    window.open(url, '_blank');
  }

  // Call phone number
  callNumber(phoneNumber: string): void {
    window.location.href = this.buildCallUrl(phoneNumber);
  }
}

// Export singleton instance
export const GeolocationService = new GeolocationServiceClass();
export default GeolocationService;
