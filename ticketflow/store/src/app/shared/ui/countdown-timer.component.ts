import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'store-countdown-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors"
      [class.bg-contrast\/15]="isUrgent()"
      [class.text-contrast]="isUrgent()"
      [class.border-contrast\/30]="isUrgent()"
      [class.border]="true"
      [class.bg-accent\/15]="!isUrgent()"
      [class.text-dark]="!isUrgent()"
      [class.border-accent\/30]="!isUrgent()"
    >
      <span class="animate-pulse">⏳</span>
      <span>Tus boletos están reservados por:</span>
      <span class="font-extrabold text-sm">{{ formattedTime() }}</span>
    </div>
  `,
})
export class CountdownTimerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) expiryTime!: number; // Unix timestamp in ms
  @Output() timerExpired = new EventEmitter<void>();

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

    if (diff <= 0) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.timerExpired.emit();
    }
  }
}
