import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export type EmptyStateIllustration = 'search' | 'tickets' | 'events' | 'wallet' | 'default';

@Component({
  selector: 'tf-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="py-16 sm:py-20 px-4 text-center space-y-6 max-w-md mx-auto">
      <!-- Vector / Illustration Backdrop -->
      <div class="relative w-28 h-28 mx-auto flex items-center justify-center">
        <div class="absolute inset-0 rounded-3xl bg-gradient-to-tr from-primary/10 via-secondary/10 to-tertiary/10 blur-xl transform rotate-6"></div>
        <div class="relative w-full h-full rounded-3xl border border-outline-variant/30 bg-surface/80 backdrop-blur-md shadow-lg flex items-center justify-center text-4xl text-on-surface-variant/40">
          <i [class]="iconClass"></i>
        </div>
      </div>

      <!-- Content -->
      <div class="space-y-2">
        <h3 class="text-lg sm:text-xl font-bold text-on-surface tracking-tight">
          {{ title }}
        </h3>
        <p *ngIf="description" class="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-sm mx-auto">
          {{ description }}
        </p>
      </div>

      <!-- Actions -->
      <div *ngIf="actionLabel" class="pt-2">
        <ng-container *ngIf="actionRoute; else buttonAction">
          <a [routerLink]="actionRoute">
            <button
              type="button"
              class="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              {{ actionLabel }}
            </button>
          </a>
        </ng-container>

        <ng-template #buttonAction>
          <button
            type="button"
            (click)="actionClicked.emit()"
            class="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
          >
            {{ actionLabel }}
          </button>
        </ng-template>
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title = 'No hay información disponible';
  @Input() description?: string;
  @Input() icon = 'fa-solid fa-folder-open';
  @Input() illustration: EmptyStateIllustration = 'default';
  @Input() actionLabel?: string;
  @Input() actionRoute?: string | string[];

  @Output() actionClicked = new EventEmitter<void>();

  get iconClass(): string {
    if (this.illustration === 'search') return 'fa-solid fa-magnifying-glass-chart text-primary';
    if (this.illustration === 'tickets') return 'fa-solid fa-ticket-simple text-primary';
    if (this.illustration === 'events') return 'fa-solid fa-calendar-xmark text-secondary';
    if (this.illustration === 'wallet') return 'fa-solid fa-wallet text-tertiary';
    return this.icon;
  }
}
