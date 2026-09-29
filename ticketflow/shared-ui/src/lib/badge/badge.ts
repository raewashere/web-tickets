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
      primary: 'bg-primary/10 text-primary',
      accent: 'bg-accent/20 text-primary',
      danger: 'bg-danger/10 text-danger',
      success: 'bg-contrast/15 text-contrast',
      warning: 'bg-amber-100 text-amber-800',
    };
    return `${base} ${variants[this.variant]}`;
  }
}
