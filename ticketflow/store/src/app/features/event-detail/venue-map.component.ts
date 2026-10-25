// store/src/app/features/event-detail/venue-map.component.ts
// Embeds an interactive OpenStreetMap map at the event's venue location.
// Uses Leaflet (loaded dynamically, no API key required).
// Shows a pin at the venue coordinates with a popup, and a link to Google Maps.

import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

// Minimal Leaflet typings
interface LeafletMap {
  setView: (c: [number, number], z: number) => LeafletMap;
  remove: () => void;
}
interface LeafletStatic {
  map: (el: HTMLElement, opts?: object) => LeafletMap;
  tileLayer: (url: string, opts?: object) => { addTo: (m: LeafletMap) => void };
  marker: (latlng: [number, number], opts?: object) => {
    addTo: (m: LeafletMap) => { bindPopup: (html: string) => { openPopup: () => void } };
  };
}
declare global { interface Window { L?: LeafletStatic; } }

@Component({
  selector: 'store-venue-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-dark flex items-center gap-2">
          <i class="fa-solid fa-map-location-dot text-primary"></i> Ubicación del Recinto
        </h3>
        <a
          *ngIf="lat && lng"
          [href]="'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          Cómo llegar <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
        </a>
      </div>

      <!-- Map -->
      <div
        #mapEl
        class="w-full h-56 rounded-2xl overflow-hidden border border-dark/10 shadow-sm bg-surface"
      ></div>

      <!-- Venue name -->
      <p *ngIf="venueName" class="text-xs text-dark/60 flex items-center gap-1.5">
        <i class="fa-solid fa-location-dot text-accent"></i>
        <span>{{ venueName }}</span>
      </p>
    </div>
  `,
})
export class VenueMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLElement>;

  @Input() lat!: number;
  @Input() lng!: number;
  @Input() venueName?: string;

  private readonly platformId = inject(PLATFORM_ID);
  private map: LeafletMap | null = null;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.lat && this.lng) {
      this.loadAndInit();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private async loadAndInit(): Promise<void> {
    await this.loadLeaflet();
    this.initMap();
  }

  private loadLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      if (window.L) { resolve(); return; }
      // CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // JS
      if (document.getElementById('leaflet-js')) {
        document.getElementById('leaflet-js')!.onload = () => resolve();
        return;
      }
      const s = document.createElement('script');
      s.id = 'leaflet-js';
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  private initMap(): void {
    const L = window.L;
    if (!L || !this.mapEl?.nativeElement) return;

    this.map = L.map(this.mapEl.nativeElement).setView([this.lat, this.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Fix default Leaflet icon paths
    try {
      const LAny = L as any;
      if (LAny.Icon?.Default?.mergeOptions) {
        LAny.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      }
    } catch {
      // ignore
    }

    const markerOptions: Record<string, unknown> = {};
    try {
      const LAny = L as any;
      if (typeof LAny.divIcon === 'function') {
        markerOptions['icon'] = LAny.divIcon({
          className: 'tf-store-marker-pin',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background-color: #540D6E;
              border: 2.5px solid #FFFFFF;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
            ">
              <i class="fa-solid fa-location-dot" style="transform: rotate(45deg); color: #FFFFFF; font-size: 14px;"></i>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
      }
    } catch {
      // fallback
    }

    L.marker([this.lat, this.lng], markerOptions)
      .addTo(this.map)
      .bindPopup(`<strong>${this.venueName ?? 'Recinto'}</strong>`)
      .openPopup();
  }
}
