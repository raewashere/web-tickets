import { Injectable, Optional, Inject, InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>(
  'SUPABASE_CONFIG'
);

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor(
    @Optional() @Inject(SUPABASE_CONFIG) customConfig?: SupabaseConfig
  ) {
    const metaEnv = (
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as Record<string, unknown>)?.['env']
    ) as Record<string, string> | undefined;

    const globalObj = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as Record<string, unknown>)
      : undefined;

    const procEnv = (
      globalObj?.['process'] as { env?: Record<string, string> } | undefined
    )?.env;

    const winEnv = (
      globalObj?.['window'] as { __ENV__?: Record<string, string> } | undefined
    )?.__ENV__;

    const url =
      customConfig?.supabaseUrl ||
      metaEnv?.['VITE_SUPABASE_URL'] ||
      procEnv?.['SUPABASE_URL'] ||
      procEnv?.['VITE_SUPABASE_URL'] ||
      winEnv?.['SUPABASE_URL'] ||
      'https://tyohkooarijtnnyheoex.supabase.co';

    const key =
      customConfig?.supabaseAnonKey ||
      metaEnv?.['VITE_SUPABASE_ANON_KEY'] ||
      procEnv?.['SUPABASE_ANON_KEY'] ||
      procEnv?.['VITE_SUPABASE_ANON_KEY'] ||
      winEnv?.['SUPABASE_ANON_KEY'] ||
      '';

    this.client = createClient(url, key || 'dummy-anon-key');
  }
}
