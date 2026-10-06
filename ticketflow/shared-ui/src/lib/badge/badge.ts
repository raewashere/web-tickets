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
      default: 'bg-surface-variant text-on-surface-variant',
      primary: 'bg-primary-container text-on-primary-container',
      accent: 'bg-secondary-container text-on-secondary-container',
      danger: 'bg-error-container text-on-error-container',
      success: 'bg-tertiary-container text-on-tertiary-container',
      warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
    };
    return `${base} ${variants[this.variant]}`;
  }
}
