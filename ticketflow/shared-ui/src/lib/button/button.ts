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
      primary: 'bg-primary text-dark hover:bg-primary/90 focus:ring-primary',
      secondary:
        'bg-dark text-surface hover:bg-dark/90 focus:ring-dark border border-surface/20',
      danger: 'bg-contrast text-white hover:bg-contrast/90 focus:ring-contrast',
      ghost: 'bg-transparent text-dark hover:bg-dark/10 focus:ring-dark',
      accent: 'bg-accent text-dark hover:bg-accent/90 focus:ring-accent',
      outline: 'bg-transparent text-dark border border-dark/20 hover:bg-dark/5 focus:ring-primary',
    };

    return `${base} ${sizes[this.size]} ${variants[this.variant]}`;
  }
}
