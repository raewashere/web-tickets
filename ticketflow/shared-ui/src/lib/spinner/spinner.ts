import { Component, Input } from '@angular/core';

@Component({
  selector: 'tf-spinner',
  standalone: true,
  template: `
    <div [class]="spinnerClasses" role="status" [attr.aria-label]="label">
      <div
        class="border-4 border-current border-t-transparent rounded-full animate-spin"
        [class]="circleClasses"
      ></div>
    </div>
  `,
})
export class SpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() label = 'Loading...';

  get spinnerClasses(): string {
    return 'flex items-center justify-center text-primary';
  }

  get circleClasses(): string {
    const sizes: Record<'sm' | 'md' | 'lg', string> = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };
    return sizes[this.size];
  }
}
