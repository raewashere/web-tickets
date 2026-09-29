import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '@ticketflow/shared-ui';

@Component({
  selector: 'store-countdown-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all duration-300 border shadow-sm"
      [class.bg-danger\/10]="isUrgent()"
      [class.text-danger]="isUrgent()"
      [class.border-danger\/30]="isUrgent()"
      [class.shadow-\[0_0_15px_rgba\(192\,57\,43\,0\.25\)\]]="isUrgent()"
      [class.animate-pulse]="isUrgent()"
      [class.bg-primary\/5]="!isUrgent()"
      [class.text-dark]="!isUrgent()"
      [class.border-primary\/20]="!isUrgent()"
      [class.shadow-\[0_0_10px_rgba\(78\,10\,11\,0\.1\)\]]="!isUrgent()"
    >
      <span class="relative flex h-2.5 w-2.5">
        <span
          class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          [class.bg-danger]="isUrgent()"
          [class.bg-accent]="!isUrgent()"
        ></span>
        <span
          class="relative inline-flex rounded-full h-2.5 w-2.5"
          [class.bg-danger]="isUrgent()"
          [class.bg-primary]="!isUrgent()"
        ></span>
      </span>
      <span class="font-sans font-semibold">Tus boletos están reservados por:</span>
      <span
        class="font-bold text-sm tracking-tight"
        [class.text-danger]="isUrgent()"
        [class.text-primary]="!isUrgent()"
      >
        {{ formattedTime() }}
      </span>
    </div>
  `,
})
export class CountdownTimerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) expiryTime!: number; // Unix timestamp in ms
  @Output() timerExpired = new EventEmitter<void>();

  private readonly toast = inject(ToastService);
  private hasWarned = false;

  readonly remainingSeconds = signal<number>(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly formattedTime = computed(() => {
    const total = Math.max(0, this.remainingSeconds());
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(mins)}:${pad(secs)}`;
  });

  readonly isUrgent = computed(() => this.remainingSeconds() < 120);

  ngOnInit(): void {
    this.updateRemaining();
    this.intervalId = setInterval(() => {
      this.updateRemaining();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private updateRemaining(): void {
    const now = Date.now();
    const diff = Math.max(0, Math.floor((this.expiryTime - now) / 1000));
    this.remainingSeconds.set(diff);

    if (diff >= 120) {
      this.hasWarned = false;
    } else if (diff > 0 && diff < 120 && !this.hasWarned) {
      this.hasWarned = true;
      this.toast.warning(
        '¡Atención!',
        'Quedan menos de 2 minutos para completar tu compra antes de liberar los boletos.'
      );
    }

    if (diff <= 0) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.timerExpired.emit();
    }
  }
}

