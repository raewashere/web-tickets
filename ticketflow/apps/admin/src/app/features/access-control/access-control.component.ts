import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  AccessControlService,
  ValidationResponse,
  CheckInStats,
  ValidationLog,
} from './access-control.service';
import type { Event } from '@ticketflow/models';
import { AuthService } from '@ticketflow/data-access';
import {
  ButtonComponent,
  CardComponent,
  SpinnerComponent,
} from '@ticketflow/shared-ui';

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
    };
  }
}

@Component({
  selector: 'app-access-control',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    CardComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav class="flex items-center gap-2 text-xs text-dark/60 mb-2">
            <a routerLink="/events" class="hover:text-primary transition-colors flex items-center gap-1">
              Eventos
            </a>
            <span>/</span>
            <span class="text-dark font-semibold">Control de Acceso</span>
          </nav>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-dark tracking-tight flex items-center gap-2">
            <span>🛡️</span> Control de Acceso & Validador QR
          </h1>
          <p class="text-xs sm:text-sm text-dark/60 mt-1">
            Escanea los boletos de los asistentes en tiempo real y valida su ingreso al recinto.
          </p>
        </div>

        <!-- Event selector (Admin / Artist mode) -->
        <div *ngIf="!isDoormanMode()" class="w-full sm:w-72">
          <label class="block text-[10px] font-bold uppercase tracking-wider text-dark/60 mb-1">
            Evento Seleccionado
          </label>
          <select
            [ngModel]="selectedEventId()"
            (ngModelChange)="onEventChanged($event)"
            class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-dark/20 bg-surface text-dark focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="" disabled>Selecciona un evento...</option>
            <option *ngFor="let ev of events()" [value]="ev.id">
              {{ ev.name }} ({{ ev.event_date | date:'shortDate' }})
            </option>
          </select>
        </div>

        <!-- Event Badge (Doorman Mode) -->
        <div *ngIf="isDoormanMode()" class="w-full sm:w-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/15 border border-primary/30 text-dark">
          <span class="text-base">🎯</span>
          <div>
            <span class="text-[10px] uppercase tracking-wider font-extrabold text-primary block">Evento Asignado</span>
            <span class="text-xs font-black">{{ events()[0]?.name || 'Cargando espectáculo...' }}</span>
          </div>
        </div>
      </div>

      <!-- No event selected prompt -->
      <div *ngIf="!selectedEventId()" class="py-16 text-center rounded-3xl border border-dashed border-dark/20 p-8 bg-surface space-y-3">
        <span class="text-4xl block">🎪</span>
        <h3 class="text-base font-bold text-dark">Selecciona un evento para iniciar el control de acceso</h3>
        <p class="text-xs text-dark/60 max-w-sm mx-auto">
          Elige el show correspondiente en el selector superior para comenzar a validar los códigos QR de los boletos.
        </p>
      </div>

      <div *ngIf="selectedEventId()" class="space-y-6">
        <!-- Live Stats Row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-surface border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-wider text-dark/50 block">Boletos Vendidos</span>
            <span class="text-2xl font-black text-dark font-mono">{{ stats().totalSoldTickets }}</span>
          </div>

          <div class="p-4 rounded-2xl bg-surface border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-wider text-dark/50 block">Ingresados en Puerta</span>
            <span class="text-2xl font-black text-green-600 font-mono">{{ stats().totalCheckedIn }}</span>
          </div>

          <div class="p-4 rounded-2xl bg-surface border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-wider text-dark/50 block">Por Ingresar</span>
            <span class="text-2xl font-black text-primary font-mono">
              {{ Math.max(0, stats().totalSoldTickets - stats().totalCheckedIn) }}
            </span>
          </div>

          <div class="p-4 rounded-2xl bg-surface border border-dark/10 shadow-sm space-y-1">
            <span class="text-[10px] uppercase font-bold tracking-wider text-dark/50 block">% Afluencia</span>
            <span class="text-2xl font-black text-accent font-mono">{{ attendancePct() }}%</span>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Left Column: Scanner & Manual Input (7 cols) -->
          <div class="lg:col-span-7 space-y-6">
            <tf-card title="Cámara Escáner QR" subtitle="Apunta la cámara del dispositivo al código QR del pase digital">
              <div class="space-y-4">
                <!-- Camera view area -->
                <div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-dark/10 shadow-inner">
                  <video
                    #videoEl
                    playsinline
                    muted
                    autoplay
                    class="w-full h-full object-cover"
                    [class.hidden]="!isCameraActive()"
                  ></video>

                  <!-- Camera target overlay box -->
                  <div *ngIf="isCameraActive()" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="w-56 h-56 border-2 border-primary rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] animate-pulse">
                      <div class="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                      <div class="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                      <div class="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                      <div class="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                    </div>
                  </div>

                  <!-- Camera inactive state -->
                  <div *ngIf="!isCameraActive()" class="text-center p-6 space-y-3 text-surface/70">
                    <span class="text-4xl block">📷</span>
                    <p class="text-xs">La cámara está apagada o no se han concedido permisos.</p>
                    <tf-button
                      type="button"
                      variant="primary"
                      size="sm"
                      (click)="startCamera()"
                    >
                      Encender Cámara
                    </tf-button>
                  </div>
                </div>

                <!-- Camera Controls -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      *ngIf="isCameraActive()"
                      (click)="stopCamera()"
                      class="px-3 py-1.5 rounded-xl bg-dark/10 text-dark hover:bg-dark/20 text-xs font-bold transition-colors"
                    >
                      ⏹ Detener Cámara
                    </button>
                    <button
                      type="button"
                      *ngIf="!isCameraActive()"
                      (click)="startCamera()"
                      class="px-3 py-1.5 rounded-xl bg-primary text-dark hover:bg-primary/90 text-xs font-bold transition-colors"
                    >
                      ▶ Iniciar Cámara
                    </button>
                  </div>

                  <span class="text-[11px] text-dark/60 font-semibold">
                    {{ isScanning() ? 'Escaneando...' : 'En espera' }}
                  </span>
                </div>

                <!-- Manual code entry fallback -->
                <div class="pt-4 border-t border-dark/10 space-y-2">
                  <label class="block text-xs font-bold text-dark">
                    O ingresar código manualmente:
                  </label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [(ngModel)]="manualCodeInput"
                      (keyup.enter)="validateManualCode()"
                      placeholder="Ej. TICKETFLOW-AUTH-A1B2C3D4 o UUID de orden"
                      class="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-dark/20 bg-surface text-dark placeholder-dark/40 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <tf-button
                      type="button"
                      variant="secondary"
                      size="sm"
                      [disabled]="!manualCodeInput.trim() || isValidating()"
                      (click)="validateManualCode()"
                    >
                      <span *ngIf="!isValidating()">Validar</span>
                      <tf-spinner *ngIf="isValidating()" size="sm" color="dark"></tf-spinner>
                    </tf-button>
                  </div>
                </div>
              </div>
            </tf-card>
          </div>

          <!-- Right Column: Live Validation Banner & Recent Log (5 cols) -->
          <div class="lg:col-span-5 space-y-6">
            <!-- Scan Result Live Card -->
            <div
              *ngIf="lastResult()"
              class="p-6 rounded-3xl border-2 transition-all duration-300 shadow-lg space-y-4"
              [ngClass]="{
                'bg-green-50 border-green-500 text-green-950': lastResult()!.result === 'valid',
                'bg-amber-50 border-amber-500 text-amber-950': lastResult()!.result === 'already_used',
                'bg-blue-50 border-blue-500 text-blue-950': lastResult()!.result === 'doors_not_open',
                'bg-red-50 border-red-500 text-red-950': !['valid', 'already_used', 'doors_not_open'].includes(lastResult()!.result)
              }"
            >
              <div class="flex items-center gap-3">
                <span class="text-3xl">
                  {{
                    lastResult()!.result === 'valid'
                      ? '✅'
                      : lastResult()!.result === 'already_used'
                      ? '⚠️'
                      : lastResult()!.result === 'doors_not_open'
                      ? '⏰'
                      : '❌'
                  }}
                </span>
                <div>
                  <h3 class="font-black text-lg leading-tight">
                    {{
                      lastResult()!.result === 'valid'
                        ? '¡ACCESO AUTORIZADO!'
                        : lastResult()!.result === 'already_used'
                        ? 'BOLETO YA CANJEADO'
                        : lastResult()!.result === 'doors_not_open'
                        ? 'PUERTAS CERRADAS'
                        : 'ACCESO DENEGADO'
                    }}
                  </h3>
                  <p class="text-xs font-semibold opacity-80 mt-0.5">
                    {{ lastResult()!.message }}
                  </p>
                </div>
              </div>

              <!-- Ticket info if valid or already used -->
              <div *ngIf="lastResult()!.customer_name" class="p-3.5 rounded-2xl bg-white/70 border border-black/5 text-xs space-y-1.5">
                <p class="font-bold">
                  Titular: <span class="font-normal">{{ lastResult()!.customer_name }}</span>
                </p>
                <div *ngIf="lastResult()!.items && lastResult()!.items!.length > 0" class="space-y-1 pt-1 border-t border-black/5">
                  <p class="font-bold text-[10px] uppercase tracking-wider opacity-60">Entradas amparadas:</p>
                  <div *ngFor="let item of lastResult()!.items" class="flex justify-between font-semibold">
                    <span>{{ item.quantity }}x {{ item.ticket_type_name }}</span>
                    <span class="font-mono text-[10px] opacity-70">{{ item.sku }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Check-In Stream -->
            <tf-card title="Historial Reciente de Ingresos" subtitle="Últimas validaciones realizadas en este acceso">
              <div *ngIf="recentLogs().length === 0" class="py-6 text-center text-xs text-dark/50">
                Aún no hay escaneos registrados para este evento.
              </div>

              <div *ngIf="recentLogs().length > 0" class="divide-y divide-dark/10 -mx-4 -my-2 text-xs">
                <div *ngFor="let log of recentLogs()" class="p-3 flex items-center justify-between hover:bg-dark/5 transition-colors">
                  <div class="flex items-center gap-2.5">
                    <span>{{ log.result === 'valid' ? '🟢' : (log.result === 'already_used' ? '🟡' : '🔴') }}</span>
                    <div>
                      <p class="font-bold text-dark leading-tight">{{ log.message }}</p>
                      <span class="font-mono text-[10px] text-dark/40">{{ log.scanned_code }}</span>
                    </div>
                  </div>

                  <span class="text-[10px] text-dark/50 font-mono">
                    {{ log.created_at | date:'shortTime' }}
                  </span>
                </div>
              </div>
            </tf-card>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AccessControlComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  private readonly accessControl = inject(AccessControlService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  readonly auth = inject(AuthService);

  protected readonly Math = Math;

  readonly events = signal<Event[]>([]);
  readonly selectedEventId = signal<string>('');
  readonly stats = signal<CheckInStats>({
    totalSoldTickets: 0,
    totalCheckedIn: 0,
    totalOrders: 0,
    checkedInOrders: 0,
  });
  readonly recentLogs = signal<ValidationLog[]>([]);
  readonly lastResult = signal<ValidationResponse | null>(null);

  readonly isCameraActive = signal(false);
  readonly isScanning = signal(false);
  readonly isValidating = signal(false);

  manualCodeInput = '';
  private mediaStream: MediaStream | null = null;
  private scanIntervalId: unknown = null;
  private lastScannedCode = '';
  private lastScannedTimestamp = 0;

  readonly attendancePct = computed(() => {
    const s = this.stats();
    if (!s.totalSoldTickets) return 0;
    return Math.round((s.totalCheckedIn / s.totalSoldTickets) * 100);
  });

  readonly isDoormanMode = signal(false);

  async ngOnInit(): Promise<void> {
    const roles = this.auth.roles();
    const isDoormanOnly = roles.includes('doorman') && !this.auth.isAdmin() && !this.auth.isArtist();

    if (isDoormanOnly) {
      this.isDoormanMode.set(true);
      const doormanEventId = await this.accessControl.getDoormanEventId();
      if (doormanEventId) {
        const list = await this.accessControl.getEvents();
        this.events.set(list);
        await this.onEventChanged(doormanEventId);
        return;
      }
    }

    const list = await this.accessControl.getEvents();
    this.events.set(list);

    // Check if event ID was passed as route param
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && list.some((e) => e.id === routeId)) {
      this.onEventChanged(routeId);
    } else if (list.length > 0) {
      this.onEventChanged(list[0].id);
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  async onEventChanged(eventId: string): Promise<void> {
    this.selectedEventId.set(eventId);
    this.lastResult.set(null);
    if (!eventId) return;

    await this.refreshStatsAndLogs();
  }

  private async refreshStatsAndLogs(): Promise<void> {
    const evId = this.selectedEventId();
    if (!evId) return;

    const [stats, logs] = await Promise.all([
      this.accessControl.getStats(evId),
      this.accessControl.getRecentLogs(evId),
    ]);

    this.stats.set(stats);
    this.recentLogs.set(logs);
  }

  // ---------------------------------------------------------------------------
  // Camera & Barcode Scanning
  // ---------------------------------------------------------------------------

  async startCamera(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      this.isCameraActive.set(true);

      setTimeout(() => {
        if (this.videoEl?.nativeElement && this.mediaStream) {
          this.videoEl.nativeElement.srcObject = this.mediaStream;
          this.videoEl.nativeElement.play();
          this.startScanLoop();
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      alert('No se pudo acceder a la cámara. Por favor permite los permisos o ingresa el código manual.');
    }
  }

  stopCamera(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId as number);
      this.scanIntervalId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive.set(false);
    this.isScanning.set(false);
  }

  private startScanLoop(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isScanning.set(true);

    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let detector: unknown = null;

    if (hasBarcodeDetector && window.BarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('BarcodeDetector initialization warning:', e);
      }
    }

    this.scanIntervalId = setInterval(async () => {
      if (!this.videoEl?.nativeElement || this.isValidating()) return;
      const video = this.videoEl.nativeElement;
      if (video.readyState < video.HAVE_CURRENT_DATA) return;

      if (detector) {
        try {
          const barcodes = await (detector as { detect: (s: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> }).detect(video);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            this.handleDetectedCode(raw);
          }
        } catch (e) {
          // ignore frame errors
        }
      }
    }, 400);
  }

  private async handleDetectedCode(code: string): Promise<void> {
    const now = Date.now();
    // Debounce identical scans within 3 seconds
    if (code === this.lastScannedCode && now - this.lastScannedTimestamp < 3000) {
      return;
    }

    this.lastScannedCode = code;
    this.lastScannedTimestamp = now;

    await this.processValidation(code);
  }

  async validateManualCode(): Promise<void> {
    if (!this.manualCodeInput.trim()) return;
    const code = this.manualCodeInput.trim();
    this.manualCodeInput = '';
    await this.processValidation(code);
  }

  private async processValidation(code: string): Promise<void> {
    const evId = this.selectedEventId();
    if (!evId) return;

    this.isValidating.set(true);

    try {
      const res = await this.accessControl.validateTicket(code, evId);
      this.lastResult.set(res);

      if (res.result === 'valid') {
        this.playSuccessBeep();
      } else {
        this.playErrorBeep();
      }

      await this.refreshStatsAndLogs();
    } finally {
      this.isValidating.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Web Audio Feedback (synthesizer, no audio assets required)
  // ---------------------------------------------------------------------------

  private playSuccessBeep(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1); // D6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not permitted or supported
    }
  }

  private playErrorBeep(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // Low buzz
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio not permitted
    }
  }
}
