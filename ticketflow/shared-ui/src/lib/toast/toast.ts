import { Component, Injectable, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(type: ToastType, title: string, message?: string, duration = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, type, title, message, duration };
    this.toasts.update(list => [...list, item]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(title: string, message?: string, duration?: number): void {
    this.show('success', title, message, duration);
  }

  error(title: string, message?: string, duration?: number): void {
    this.show('error', title, message, duration);
  }

  info(title: string, message?: string, duration?: number): void {
    this.show('info', title, message, duration);
  }

  warning(title: string, message?: string, duration?: number): void {
    this.show('warning', title, message, duration);
  }

  remove(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}

@Component({
  selector: 'tf-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="toastService.toasts().length > 0"
      class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none"
    >
      <div
        *ngFor="let t of toastService.toasts()"
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0"
        [ngClass]="{
          'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/20': t.type === 'success',
          'bg-rose-950/95 text-white border-rose-500/50 shadow-rose-950/20': t.type === 'error',
          'bg-slate-900/95 text-white border-cyan-500/50 shadow-cyan-950/20': t.type === 'info',
          'bg-amber-950/95 text-white border-amber-500/50 shadow-amber-950/20': t.type === 'warning'
        }"
      >
        <!-- Icon -->
        <div class="text-xl flex-shrink-0 mt-0.5" [ngClass]="{
          'text-emerald-400': t.type === 'success',
          'text-rose-400': t.type === 'error',
          'text-cyan-400': t.type === 'info',
          'text-amber-400': t.type === 'warning'
        }">
          <i *ngIf="t.type === 'success'" class="fa-solid fa-circle-check"></i>
          <i *ngIf="t.type === 'error'" class="fa-solid fa-circle-exclamation"></i>
          <i *ngIf="t.type === 'info'" class="fa-solid fa-circle-info"></i>
          <i *ngIf="t.type === 'warning'" class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 space-y-0.5">
          <h4 class="text-sm font-extrabold leading-snug">{{ t.title }}</h4>
          <p *ngIf="t.message" class="text-xs text-slate-300 leading-relaxed">{{ t.message }}</p>
        </div>

        <!-- Close button -->
        <button
          type="button"
          (click)="toastService.remove(t.id)"
          class="text-slate-400 hover:text-white p-1 transition-colors"
        >
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
