import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tf-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-dark rounded-xl p-6 flex flex-col gap-2 relative overflow-hidden">
      <div class="flex items-center justify-between">
        <p class="text-surface/60 text-sm font-medium uppercase tracking-wide">{{ label }}</p>
        <i *ngIf="icon" [class]="icon + ' text-surface/30 text-lg'"></i>
      </div>
      <p class="text-accent text-3xl font-bold">{{ value }}</p>
      <p *ngIf="description" class="text-surface/40 text-xs">{{ description }}</p>
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() description?: string;
  @Input() icon?: string;
}
