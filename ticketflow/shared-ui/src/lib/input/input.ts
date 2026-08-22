import { Component, Input, forwardRef } from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tf-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-col gap-1">
      <label *ngIf="label" [for]="inputId" class="text-sm font-medium text-dark">
        {{ label }}
        <span *ngIf="required" class="text-contrast ml-0.5">*</span>
      </label>
      <input
        [id]="inputId"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="isDisabled"
        [value]="value"
        [class]="inputClasses"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      <p *ngIf="hint && !error" class="text-xs text-dark/50">{{ hint }}</p>
      <p *ngIf="error" class="text-xs text-contrast">{{ error }}</p>
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() hint?: string;
  @Input() error?: string;
  @Input() required = false;
  @Input() inputId = `tf-input-${Math.random().toString(36).slice(2)}`;

  value = '';
  isDisabled = false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange = (_: string) => {};
  onTouched = () => {};

  get inputClasses(): string {
    const base =
      'w-full rounded-lg border px-3 py-2 text-dark placeholder:text-dark/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';
    return this.error
      ? `${base} border-contrast focus:border-contrast`
      : `${base} border-dark/20 focus:border-primary`;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  writeValue(value: string): void {
    this.value = value ?? '';
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
