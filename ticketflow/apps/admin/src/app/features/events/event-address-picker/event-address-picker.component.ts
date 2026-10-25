import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapPickerComponent, MapCoordinates } from '../../venues/map-picker/map-picker.component';
import type { VenueWithConfigurations } from '@ticketflow/models';
import { SpinnerComponent } from '@ticketflow/shared-ui';

export interface EventCoordinates {
  lat: number;
  lng: number;
}

interface CityPreset {
  name: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-event-address-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MapPickerComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="space-y-4">
      <!-- Venue suggestion banner if venue is selected -->
      <div
        *ngIf="selectedVenue && (selectedVenue.address || selectedVenue.latitude)"
        class="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-landmark text-primary text-base"></i>
          <div>
            <span class="font-bold text-dark">Sede seleccionada: {{ selectedVenue.name }}</span>
            <p class="text-dark/70 mt-0.5" *ngIf="selectedVenue.address">
              {{ selectedVenue.address }}
            </p>
          </div>
        </div>

        <button
          type="button"
          (click)="useVenueLocation()"
          class="px-3 py-1.5 rounded-lg bg-primary text-surface font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <i class="fa-solid fa-copy mr-1"></i> Usar datos de la sede
        </button>
      </div>

      <!-- Address Input -->
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-dark mb-1.5">
          Dirección del Evento / Recinto
        </label>

        <div class="relative flex items-center">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark/40 text-sm">
            <i class="fa-solid fa-map-pin text-primary"></i>
          </span>

          <input
            type="text"
            [(ngModel)]="address"
            (ngModelChange)="onAddressManualChange()"
            placeholder="Ej. Dakota s/n, Nápoles, Benito Juárez, 03810 Ciudad de México, CDMX"
            class="w-full pl-10 pr-12 py-2.5 rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
          />

          <button
            *ngIf="address"
            type="button"
            (click)="clearAddress()"
            title="Borrar texto"
            class="absolute right-2 p-1.5 rounded-lg text-dark/40 hover:text-dark hover:bg-dark/5 transition-colors text-xs"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <p class="text-xs text-dark/50 mt-1">
          La dirección física se almacena para que los asistentes puedan buscar el show por ubicación y llegar al recinto.
        </p>
      </div>

      <!-- Quick City Presets for Map -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-dark/70">Ubicar rápidamente por ciudad:</span>

          <button
            type="button"
            (click)="acquireCurrentLocation()"
            [disabled]="isLocating()"
            class="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
          >
            <i class="fa-solid fa-location-crosshairs" *ngIf="!isLocating()"></i>
            <tf-spinner size="sm" color="primary" *ngIf="isLocating()"></tf-spinner>
            <span>Mi ubicación GPS</span>
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            *ngFor="let city of cityPresets"
            (click)="applyPreset(city)"
            class="px-2.5 py-1 rounded-lg text-xs font-medium bg-dark/5 text-dark/80 hover:bg-primary/20 hover:text-dark border border-dark/10 transition-colors"
          >
            <i class="fa-solid fa-location-dot text-primary mr-1 text-[10px]"></i> {{ city.name }}
          </button>
        </div>
      </div>

      <!-- Interactive Map Picker (Leaflet + OpenStreetMap) -->
      <div>
        <admin-map-picker
          [lat]="currentLat()"
          [lng]="currentLng()"
          (coordinatesChanged)="onMapCoordinatesChanged($event)"
        ></admin-map-picker>
      </div>
    </div>
  `,
})
export class EventAddressPickerComponent implements OnInit, OnChanges {
  @Input() initialAddress?: string | null;
  @Input() initialLat?: number | null;
  @Input() initialLng?: number | null;
  @Input() selectedVenue?: VenueWithConfigurations | null;

  @Output() addressChange = new EventEmitter<string>();
  @Output() coordinatesChange = new EventEmitter<EventCoordinates | null>();

  address = '';
  readonly currentLat = signal<number | null>(null);
  readonly currentLng = signal<number | null>(null);
  readonly isLocating = signal(false);

  readonly cityPresets: CityPreset[] = [
    { name: 'CDMX', lat: 19.4326, lng: -99.1332 },
    { name: 'Guadalajara', lat: 20.6597, lng: -103.3496 },
    { name: 'Monterrey', lat: 25.6866, lng: -100.3161 },
    { name: 'Puebla', lat: 19.0414, lng: -98.2063 },
    { name: 'Querétaro', lat: 20.5888, lng: -100.3899 },
    { name: 'Tijuana', lat: 32.5149, lng: -117.0382 },
    { name: 'Cancún', lat: 21.1619, lng: -86.8515 },
  ];

  ngOnInit(): void {
    if (this.initialAddress) {
      this.address = this.initialAddress;
    }
    if (this.initialLat != null && this.initialLng != null) {
      this.currentLat.set(Number(this.initialLat));
      this.currentLng.set(Number(this.initialLng));
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialAddress'] && !changes['initialAddress'].firstChange) {
      if (this.initialAddress && this.initialAddress !== this.address) {
        this.address = this.initialAddress;
      }
    }

    if (changes['initialLat'] || changes['initialLng']) {
      if (this.initialLat != null && this.initialLng != null) {
        this.currentLat.set(Number(this.initialLat));
        this.currentLng.set(Number(this.initialLng));
      }
    }

    if (changes['selectedVenue'] && this.selectedVenue) {
      if (!this.address && this.selectedVenue.address) {
        this.address = this.selectedVenue.address;
        this.addressChange.emit(this.address);
      }
      if (this.currentLat() === null && this.selectedVenue.latitude && this.selectedVenue.longitude) {
        this.currentLat.set(this.selectedVenue.latitude);
        this.currentLng.set(this.selectedVenue.longitude);
        this.coordinatesChange.emit({
          lat: this.selectedVenue.latitude,
          lng: this.selectedVenue.longitude,
        });
      }
    }
  }

  onAddressManualChange(): void {
    this.addressChange.emit(this.address);
  }

  clearAddress(): void {
    this.address = '';
    this.addressChange.emit('');
  }

  useVenueLocation(): void {
    if (!this.selectedVenue) return;

    if (this.selectedVenue.address) {
      this.address = this.selectedVenue.address;
      this.addressChange.emit(this.address);
    } else if (this.selectedVenue.name) {
      this.address = this.selectedVenue.name;
      this.addressChange.emit(this.address);
    }

    if (this.selectedVenue.latitude && this.selectedVenue.longitude) {
      this.currentLat.set(this.selectedVenue.latitude);
      this.currentLng.set(this.selectedVenue.longitude);
      this.coordinatesChange.emit({
        lat: this.selectedVenue.latitude,
        lng: this.selectedVenue.longitude,
      });
    }
  }

  applyPreset(city: CityPreset): void {
    this.currentLat.set(city.lat);
    this.currentLng.set(city.lng);
    this.coordinatesChange.emit({ lat: city.lat, lng: city.lng });
  }

  onMapCoordinatesChanged(coords: MapCoordinates): void {
    this.currentLat.set(coords.lat);
    this.currentLng.set(coords.lng);
    this.coordinatesChange.emit({ lat: coords.lat, lng: coords.lng });
  }

  acquireCurrentLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('La geolocalización no está disponible en este dispositivo.');
      return;
    }

    this.isLocating.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentLat.set(pos.coords.latitude);
        this.currentLng.set(pos.coords.longitude);
        this.coordinatesChange.emit({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        this.isLocating.set(false);
      },
      (err) => {
        this.isLocating.set(false);
        console.warn('Geolocation error:', err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }
}
