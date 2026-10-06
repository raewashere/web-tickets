import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'tf-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClasses"
      (click)="onClick.emit($event)"
    >
      <span *ngIf="loading" class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></span>
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Output() onClick = new EventEmitter<MouseEvent>();

  get buttonClasses(): string {
    const base =
      'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary shadow-sm shadow-primary/25',
      secondary:
        'bg-secondary text-on-secondary hover:bg-secondary/90 focus:ring-secondary shadow-sm shadow-secondary/20',
      danger: 'bg-error text-on-error hover:bg-error/90 focus:ring-error shadow-sm',
      ghost: 'bg-transparent text-on-surface hover:bg-on-surface/10 focus:ring-primary',
      accent: 'bg-secondary text-on-secondary hover:bg-secondary/90 focus:ring-secondary shadow-sm shadow-secondary/20',
      outline: 'bg-transparent text-on-surface border border-outline hover:bg-on-surface/5 focus:ring-primary',
    };

    return `${base} ${sizes[this.size]} ${variants[this.variant]}`;
  }
}
