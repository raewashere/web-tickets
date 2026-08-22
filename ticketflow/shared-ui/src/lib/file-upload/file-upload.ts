import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tf-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer"
      [class.border-primary]="isDragging"
      [class.border-dark\/20]="!isDragging"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragging = false"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <input
        #fileInput
        type="file"
        class="sr-only"
        [accept]="accept"
        (change)="onFileChange($event)"
      />

      <ng-container *ngIf="!previewUrl">
        <div class="text-4xl mb-2">📁</div>
        <p class="text-dark font-medium">{{ label }}</p>
        <p class="text-dark/50 text-sm mt-1">{{ hint }}</p>
      </ng-container>

      <ng-container *ngIf="previewUrl">
        <img
          [src]="previewUrl"
          [alt]="label"
          class="max-h-32 mx-auto rounded-lg object-cover mb-2"
        />
        <p class="text-sm text-dark/60">Click to change</p>
      </ng-container>
    </div>

    <p *ngIf="error" class="text-xs text-contrast mt-1">{{ error }}</p>
  `,
})
export class FileUploadComponent {
  @Input() label = 'Upload file';
  @Input() hint = 'Drag & drop or click to browse';
  @Input() accept = 'image/*';
  @Input() maxSizeMb = 5;
  @Input() previewUrl?: string | null;
  @Input() error?: string;
  @Output() fileSelected = new EventEmitter<File>();

  isDragging = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File): void {
    if (file.size > this.maxSizeMb * 1024 * 1024) {
      this.error = `File too large. Max size is ${this.maxSizeMb}MB.`;
      return;
    }
    this.fileSelected.emit(file);
  }
}
