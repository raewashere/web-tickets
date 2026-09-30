import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tf-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses">
      <div *ngIf="title" class="px-6 py-4 border-b border-outline-variant/30">
        <h3 class="text-lg font-semibold text-on-surface">{{ title }}</h3>
        <p *ngIf="subtitle" class="text-sm text-on-surface-variant mt-0.5">{{ subtitle }}</p>
      </div>
      <div [class]="bodyClasses">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class CardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
  @Input() shadow: 'none' | 'sm' | 'md' = 'sm';

  get cardClasses(): string {
    const shadows: Record<'none' | 'sm' | 'md', string> = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
    };
    return `bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden ${shadows[this.shadow]}`;
  }

  get bodyClasses(): string {
    const paddings: Record<'none' | 'sm' | 'md' | 'lg', string> = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };
    return paddings[this.padding];
  }
}
