import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly themeMode = signal<ThemeMode>('system');

  readonly isDark = computed(() => {
    const mode = this.themeMode();
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  constructor() {
    this.initTheme();

    // Automatically apply theme changes using Angular reactive effect
    effect(() => {
      this.applyTheme();
    });
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('tf_theme') as ThemeMode | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      this.themeMode.set(saved);
    }

    // Listen to OS theme changes if mode is 'system'
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.themeMode() === 'system') {
        this.applyTheme();
      }
    });
  }

  setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_theme', mode);
    }
  }

  toggleTheme(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyTheme(): void {
    if (typeof window === 'undefined') return;
    const root = this.document.documentElement;
    const body = this.document.body;
    const dark = this.isDark();

    if (dark) {
      root.classList.add('dark');
      body?.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body?.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }
}
