import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'warning';

@Component({
  selector: 'tf-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses">
      <ng-content></ng-content>
    </span>
  `,
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';

  get badgeClasses(): string {
    const base =
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide';
    const variants: Record<BadgeVariant, string> = {
      default: 'bg-dark/10 text-dark',
      primary: 'bg-primary/20 text-primary',
      accent: 'bg-accent text-dark',
      danger: 'bg-contrast/20 text-contrast',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
    };
    return `${base} ${variants[this.variant]}`;
  }
}
