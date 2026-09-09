import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'text' | 'title' | 'avatar' | 'card' | 'event-card' | 'button';

@Component({
  selector: 'tf-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Event Card Skeleton Preset -->
    <ng-container *ngIf="variant === 'event-card'">
      <div class="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm animate-pulse">
        <div class="aspect-[16/9] bg-slate-200"></div>
        <div class="p-5 space-y-3">
          <div class="h-4 bg-slate-200 rounded w-1/3"></div>
          <div class="h-6 bg-slate-200 rounded w-3/4"></div>
          <div class="h-4 bg-slate-200 rounded w-1/2"></div>
          <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div class="h-6 bg-slate-200 rounded w-20"></div>
            <div class="h-9 bg-slate-200 rounded-xl w-24"></div>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Card Skeleton Preset -->
    <ng-container *ngIf="variant === 'card'">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 animate-pulse">
        <div class="h-5 bg-slate-200 rounded w-1/3"></div>
        <div class="h-4 bg-slate-200 rounded w-full"></div>
        <div class="h-4 bg-slate-200 rounded w-2/3"></div>
      </div>
    </ng-container>

    <!-- Custom / Primitive Skeletons -->
    <div
      *ngIf="variant !== 'event-card' && variant !== 'card'"
      [class]="skeletonClasses"
      [style.width]="width"
      [style.height]="height"
    ></div>
  `,
})
export class SkeletonComponent {
  @Input() variant: SkeletonVariant = 'text';
  @Input() width?: string;
  @Input() height?: string;
  @Input() customClass = '';

  get skeletonClasses(): string {
    const base = 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl inline-block';
    const variantMap: Record<SkeletonVariant, string> = {
      text: 'h-4 w-full rounded',
      title: 'h-7 w-2/3 rounded-lg',
      avatar: 'w-10 h-10 rounded-full',
      card: '',
      'event-card': '',
      button: 'h-10 w-28 rounded-xl',
    };
    return `${base} ${variantMap[this.variant] || ''} ${this.customClass}`.trim();
  }
}
