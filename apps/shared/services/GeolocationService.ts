// apps/shared/services/GeolocationService.ts
// Geolocation Service for COMPASS Emergency Features
// Provides location services for emergency response and nearby facility lookup

import type { UserLocation, EmergencyFacility } from '../types';

// ================================
// TYPES
// ================================

export interface GeolocationConfig {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export type LocationCallback = (location: UserLocation) => void;
export type ErrorCallback = (error: GeolocationPositionError | Error) => void;

// ================================
// GEOLOCATION SERVICE
// ================================

class GeolocationServiceClass {
  private static instance: GeolocationServiceClass;
  private watchId: number | null = null;
  private lastKnownLocation: UserLocation | null = null;
  private config: GeolocationConfig = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000, // 1 minute cache
  };

  private constructor() {}

  static getInstance(): GeolocationServiceClass {
    if (!GeolocationServiceClass.instance) {
      GeolocationServiceClass.instance = new GeolocationServiceClass();
    }
    return GeolocationServiceClass.instance;
  }

  /**
   * Configure geolocation options
   */
  configure(config: Partial<GeolocationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if geolocation is available
   */
  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Get current position
   */
  getCurrentPosition(
    onSuccess: LocationCallback,
    onError?: ErrorCallback
  ): void {
    if (!this.isAvailable()) {
      if (onError) {
        onError(new Error('Geolocation is not supported by this browser'));
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = this.positionToUserLocation(position);
        this.lastKnownLocation = location;
        onSuccess(location);
      },
      (error) => {
        console.error('[GeolocationService] Error getting position:', error);
        if (onError) {
          onError(error);
        }
      },
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maximumAge,
      }
    );
  }

  /**
   * Get current position as a Promise
   */
  async getCurrentPositionAsync(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      this.getCurrentPosition(resolve, reject);
    });
  }

  /**
   * Watch position changes
   */
  watchPosition(
    onSuccess: LocationCallback,
    onError?: ErrorCallback
  ): () => void {
    if (!this.isAvailable()) {
      if (onError) {
        onError(new Error('Geolocation is not supported by this browser'));
      }
      return () => {};
    }

    // Clear any existing watch
    this.stopWatching();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.positionToUserLocation(position);
        this.lastKnownLocation = location;
        onSuccess(location);
      },
      (error) => {
        console.error('[GeolocationService] Watch error:', error);
        if (onError) {
          onError(error);
        }
      },
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maximumAge,
      }
    );

    return () => this.stopWatching();
  }

  /**
   * Stop watching position
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Get last known location (if available)
   */
  getLastKnownLocation(): UserLocation | null {
    return this.lastKnownLocation;
  }

  // ================================
  // EMERGENCY FACILITIES
  // ================================

  /**
   * Find nearby emergency facilities
   * Note: In production, this would call a real API
   */
  async findNearbyFacilities(
    location: UserLocation,
    type?: 'emergency-room' | 'urgent-care' | 'hospital'
  ): Promise<EmergencyFacility[]> {
    // In production, this would call Google Places API, Yelp, or a healthcare-specific API
    // For now, return mock data
    
    const mockFacilities: EmergencyFacility[] = [
      {
        type: 'emergency-room',
        name: 'UCHealth University of Colorado Hospital',
        address: '12605 E 16th Ave, Aurora, CO 80045',
        phone: '(720) 848-0000',
        distance: 2.3,
        waitTime: '15 min',
        coordinates: {
          latitude: location.latitude + 0.01,
          longitude: location.longitude + 0.01,
        },
      },
      {
        type: 'urgent-care',
        name: 'UCHealth Urgent Care - Anschutz',
        address: '1635 Aurora Ct, Aurora, CO 80045',
        phone: '(720) 848-9500',
        distance: 1.8,
        waitTime: '25 min',
        coordinates: {
          latitude: location.latitude - 0.005,
          longitude: location.longitude + 0.008,
        },
      },
      {
        type: 'emergency-room',
        name: 'Children\'s Hospital Colorado',
        address: '13123 E 16th Ave, Aurora, CO 80045',
        phone: '(720) 777-1234',
        distance: 2.8,
        waitTime: '30 min',
        coordinates: {
          latitude: location.latitude + 0.015,
          longitude: location.longitude - 0.01,
        },
      },
      {
        type: 'hospital',
        name: 'Denver Health Medical Center',
        address: '777 Bannock St, Denver, CO 80204',
        phone: '(303) 436-6000',
        distance: 8.5,
        waitTime: '45 min',
        coordinates: {
          latitude: location.latitude - 0.05,
          longitude: location.longitude - 0.03,
        },
      },
    ];

    // Filter by type if specified
    let facilities = type 
      ? mockFacilities.filter(f => f.type === type)
      : mockFacilities;

    // Sort by distance
    facilities = facilities.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    return facilities;
  }

  /**
   * Get directions URL to a facility
   */
  getDirectionsUrl(
    from: UserLocation,
    to: { latitude: number; longitude: number } | string
  ): string {
    const origin = `${from.latitude},${from.longitude}`;
    
    if (typeof to === 'string') {
      // Address string
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodeURIComponent(to)}`;
    } else {
      // Coordinates
      const destination = `${to.latitude},${to.longitude}`;
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ================================
  // PRIVATE HELPERS
  // ================================

  private positionToUserLocation(position: GeolocationPosition): UserLocation {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
    };
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// Export singleton instance
export const GeolocationService = GeolocationServiceClass.getInstance();
export default GeolocationService;
