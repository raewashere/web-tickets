import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tf-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-inverse-surface border border-outline-variant/20 rounded-2xl p-6 flex flex-col gap-2 relative overflow-hidden shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-inverse-on-surface/70 text-xs font-bold uppercase tracking-wider">{{ label }}</p>
        <i *ngIf="icon" [class]="icon + ' text-tertiary text-lg'"></i>
      </div>
      <p class="text-secondary text-3xl font-extrabold font-mono tracking-tight">{{ value }}</p>
      <p *ngIf="description" class="text-inverse-on-surface/50 text-xs">{{ description }}</p>
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() description?: string;
  @Input() icon?: string;
}
