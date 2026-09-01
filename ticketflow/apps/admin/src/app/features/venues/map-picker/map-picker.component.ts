// apps/admin/src/app/features/venues/map-picker/map-picker.component.ts
// Interactive map picker using OpenStreetMap + Leaflet (no API key required).
// The user can click anywhere on the map to set latitude/longitude,
// or drag the marker to fine-tune the position.
// Outputs: { lat: number, lng: number } via (coordinatesChanged) EventEmitter.

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

// Minimal Leaflet type declarations (avoid full @types/leaflet dependency)
interface LeafletMap {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  on: (event: string, handler: (e: LeafletEvent) => void) => void;
  remove: () => void;
}
interface LeafletMarker {
  setLatLng: (latlng: [number, number]) => LeafletMarker;
  addTo: (map: LeafletMap) => LeafletMarker;
  on: (event: string, handler: (e: LeafletEvent) => void) => void;
  getLatLng: () => { lat: number; lng: number };
}
interface LeafletEvent {
  latlng: { lat: number; lng: number };
  target: LeafletMarker;
}
interface LeafletStatic {
  map: (el: HTMLElement, opts?: object) => LeafletMap;
  tileLayer: (url: string, opts?: object) => { addTo: (m: LeafletMap) => void };
  marker: (latlng: [number, number], opts?: object) => LeafletMarker;
  icon: (opts: object) => unknown;
}

declare global {
  interface Window { L?: LeafletStatic; }
}

@Component({
  selector: 'admin-map-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <!-- Instructions -->
      <p class="text-xs text-dark/60">
        Haz clic en el mapa para colocar el marcador, o arrástralo para ajustar la posición.
      </p>

      <!-- Map container -->
      <div
        #mapContainer
        class="w-full h-72 rounded-2xl overflow-hidden border border-dark/20 shadow-inner bg-dark/5"
        [class.opacity-50]="!mapReady()"
      ></div>

      <!-- Coordinates display -->
      <div *ngIf="currentLat !== null && currentLng !== null"
        class="flex items-center gap-3 p-3 rounded-xl bg-accent/10 border border-accent/30 text-xs text-dark"
      >
        <span class="text-base">📍</span>
        <span>
          Lat: <strong class="font-mono">{{ currentLat | number:'1.5-6' }}</strong>
          &nbsp;·&nbsp;
          Lng: <strong class="font-mono">{{ currentLng | number:'1.5-6' }}</strong>
        </span>
        <a
          [href]="'https://www.google.com/maps?q=' + currentLat + ',' + currentLng"
          target="_blank"
          rel="noopener noreferrer"
          class="ml-auto font-bold text-dark hover:underline"
        >
          Ver en Google Maps ↗
        </a>
      </div>

      <!-- Loading state -->
      <p *ngIf="!mapReady()" class="text-xs text-dark/50 text-center">Cargando mapa...</p>
    </div>
  `,
})
export class MapPickerComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLElement>;

  /** Initial coordinates (e.g. from existing venue) */
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;

  /** Emits whenever the user changes the marker position */
  @Output() coordinatesChanged = new EventEmitter<MapCoordinates>();

  private readonly platformId = inject(PLATFORM_ID);

  private map: LeafletMap | null = null;
  private marker: LeafletMarker | null = null;
  private leafletLoaded = false;

  currentLat: number | null = null;
  currentLng: number | null = null;

  // Simple signal-like pattern without Angular signals for compat
  private _mapReady = false;
  mapReady(): boolean { return this._mapReady; }

  private readonly DEFAULT_LAT = 19.4326; // CDMX
  private readonly DEFAULT_LNG = -99.1332;
  private readonly DEFAULT_ZOOM = 10;

  ngOnInit(): void {
    this.currentLat = this.lat;
    this.currentLng = this.lng;
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadLeafletAndInit();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['lat'] || changes['lng']) && this.map && this.marker) {
      const newLat = this.lat ?? this.DEFAULT_LAT;
      const newLng = this.lng ?? this.DEFAULT_LNG;
      this.marker.setLatLng([newLat, newLng]);
      this.currentLat = newLat;
      this.currentLng = newLng;
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  // ---------------------------------------------------------------------------
  // Leaflet setup
  // ---------------------------------------------------------------------------

  private async loadLeafletAndInit(): Promise<void> {
    if (!this.leafletLoaded) {
      await this.loadLeafletScript();
      this.loadLeafletCss();
      this.leafletLoaded = true;
    }
    this.initMap();
  }

  private loadLeafletScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.L) { resolve(); return; }
      const existing = document.getElementById('leaflet-js');
      if (existing) { existing.onload = () => resolve(); return; }

      const script    = document.createElement('script');
      script.id       = 'leaflet-js';
      script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload   = () => resolve();
      script.onerror  = () => reject(new Error('Failed to load Leaflet'));
      document.head.appendChild(script);
    });
  }

  private loadLeafletCss(): void {
    if (document.getElementById('leaflet-css')) return;
    const link  = document.createElement('link');
    link.id     = 'leaflet-css';
    link.rel    = 'stylesheet';
    link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  private initMap(): void {
    if (!window.L || !this.mapContainer?.nativeElement) return;
    const L = window.L;

    const centerLat = this.lat ?? this.DEFAULT_LAT;
    const centerLng = this.lng ?? this.DEFAULT_LNG;
    const zoom      = this.lat ? 15 : this.DEFAULT_ZOOM;

    // Create map
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [centerLat, centerLng] as unknown as undefined,
      zoom: zoom as unknown as undefined,
    });
    this.map.setView([centerLat, centerLng], zoom);

    // OpenStreetMap tiles — no API key needed
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Draggable marker
    this.marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(this.map);

    // Click on map → move marker
    this.map.on('click', (e: LeafletEvent) => {
      const { lat, lng } = e.latlng;
      this.marker!.setLatLng([lat, lng]);
      this.emitChange(lat, lng);
    });

    // Drag marker → update
    this.marker.on('dragend', (e: LeafletEvent) => {
      const { lat, lng } = e.target.getLatLng();
      this.emitChange(lat, lng);
    });

    // Emit initial coords if provided
    if (this.lat && this.lng) {
      this.emitChange(this.lat, this.lng);
    }

    this._mapReady = true;
  }

  private emitChange(lat: number, lng: number): void {
    this.currentLat = Math.round(lat * 1_000_000) / 1_000_000;
    this.currentLng = Math.round(lng * 1_000_000) / 1_000_000;
    this.coordinatesChanged.emit({ lat: this.currentLat, lng: this.currentLng });
  }
}
