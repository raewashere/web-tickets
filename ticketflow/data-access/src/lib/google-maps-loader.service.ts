import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  private loadPromise: Promise<boolean> | null = null;
  private customApiKey: string | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof window !== 'undefined' && (window as unknown as { google?: { maps?: unknown } }).google?.maps) {
        this.isLoaded.set(true);
      }
    }
  }

  getApiKey(): string {
    if (this.customApiKey) {
      return this.customApiKey;
    }

    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      try {
        const storedKey = window.localStorage?.getItem('ticketflow_google_maps_api_key');
        if (storedKey && storedKey.trim()) {
          return storedKey.trim();
        }
      } catch {
        // localStorage not available or restricted
      }
    }

    let metaEnv: Record<string, string> | undefined;
    try {
      metaEnv = Function('return typeof import.meta !== "undefined" ? import.meta.env : undefined')() as Record<string, string> | undefined;
    } catch {
      metaEnv = undefined;
    }

    const globalObj = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as Record<string, unknown>)
      : undefined;

    const procEnv = (globalObj?.['process'] as { env?: Record<string, string> } | undefined)?.env;
    const winEnv = (globalObj?.['window'] as { __ENV__?: Record<string, string> } | undefined)?.__ENV__;

    return (
      metaEnv?.['VITE_GOOGLE_MAPS_API_KEY'] ||
      procEnv?.['GOOGLE_MAPS_API_KEY'] ||
      procEnv?.['VITE_GOOGLE_MAPS_API_KEY'] ||
      winEnv?.['GOOGLE_MAPS_API_KEY'] ||
      winEnv?.['VITE_GOOGLE_MAPS_API_KEY'] ||
      ''
    );
  }

  setCustomApiKey(key: string): void {
    this.customApiKey = key.trim();
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      try {
        if (this.customApiKey) {
          window.localStorage?.setItem('ticketflow_google_maps_api_key', this.customApiKey);
        } else {
          window.localStorage?.removeItem('ticketflow_google_maps_api_key');
        }
      } catch {
        // localStorage not available
      }
    }
  }

  async load(overrideKey?: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (overrideKey) {
      this.setCustomApiKey(overrideKey);
    }

    const currentGoogle = (window as unknown as { google?: { maps?: { places?: unknown } } }).google;
    if (currentGoogle?.maps?.places) {
      this.isLoaded.set(true);
      return true;
    }

    const key = overrideKey || this.getApiKey();
    if (!key) {
      this.error.set('No se encontró API Key de Google Maps configurada.');
      return false;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.loadPromise = new Promise<boolean>((resolve) => {
      const scriptId = 'google-maps-js-sdk';
      const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (existing) {
        if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) {
          this.isLoaded.set(true);
          this.isLoading.set(false);
          resolve(true);
          return;
        }
        existing.remove();
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry&loading=async`;

      script.onload = () => {
        this.isLoaded.set(true);
        this.isLoading.set(false);
        this.error.set(null);
        resolve(true);
      };

      script.onerror = () => {
        this.isLoading.set(false);
        this.error.set('Error al cargar la API de Google Maps. Verifica tu API Key.');
        this.loadPromise = null;
        resolve(false);
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    const g = (window as unknown as {
      google?: {
        maps?: {
          Geocoder?: new () => {
            geocode: (req: { location: { lat: number; lng: number } }) => Promise<{
              results: Array<{ formatted_address: string }>;
            }>;
          };
        };
      };
    }).google;

    if (!g?.maps?.Geocoder) return null;

    try {
      const geocoder = new g.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response && response.results && response.results.length > 0) {
        return response.results[0].formatted_address || null;
      }
    } catch (err) {
      console.warn('Google reverse geocoding warning:', err);
    }
    return null;
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!isPlatformBrowser(this.platformId) || !address?.trim()) return null;
    const g = (window as unknown as {
      google?: {
        maps?: {
          Geocoder?: new () => {
            geocode: (req: { address: string }) => Promise<{
              results: Array<{
                formatted_address: string;
                geometry: { location: { lat: () => number; lng: () => number } };
              }>;
            }>;
          };
        };
      };
    }).google;

    if (!g?.maps?.Geocoder) return null;

    try {
      const geocoder = new g.maps.Geocoder();
      const response = await geocoder.geocode({ address: address.trim() });
      if (response && response.results && response.results.length > 0) {
        const item = response.results[0];
        return {
          lat: item.geometry.location.lat(),
          lng: item.geometry.location.lng(),
          formattedAddress: item.formatted_address || address,
        };
      }
    } catch (err) {
      console.warn('Google geocoding warning:', err);
    }
    return null;
  }
}
