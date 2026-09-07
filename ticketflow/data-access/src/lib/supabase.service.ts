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
    let metaEnv: Record<string, string> | undefined;
    try {
      metaEnv = (Function('return typeof import.meta !== "undefined" ? import.meta.env : undefined')()) as Record<string, string> | undefined;
    } catch {
      metaEnv = undefined;
    }

    const globalObj = typeof globalThis !== 'undefined'
      ? (globalThis as unknown as Record<string, unknown>)
      : undefined;

    const procEnv = (
      globalObj?.['process'] as { env?: Record<string, string> } | undefined
    )?.env;

    const winEnv = (
      globalObj?.['window'] as { __ENV__?: Record<string, string> } | undefined
    )?.__ENV__;

    const DEFAULT_URL = 'https://kevgwhiosnyemaftbjqs.supabase.co';
    const DEFAULT_ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtldmd3aGlvc255ZW1hZnRianFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDIwODYsImV4cCI6MjEwNDMxODA4Nn0.Zw1oMWKyhqJ9AUm6k14-KVX0O1O96loBIskGbxfdnG0';

    const url =
      customConfig?.supabaseUrl ||
      metaEnv?.['VITE_SUPABASE_URL'] ||
      procEnv?.['SUPABASE_URL'] ||
      procEnv?.['VITE_SUPABASE_URL'] ||
      winEnv?.['SUPABASE_URL'] ||
      DEFAULT_URL;

    const key =
      customConfig?.supabaseAnonKey ||
      metaEnv?.['VITE_SUPABASE_ANON_KEY'] ||
      procEnv?.['SUPABASE_ANON_KEY'] ||
      procEnv?.['VITE_SUPABASE_ANON_KEY'] ||
      winEnv?.['SUPABASE_ANON_KEY'] ||
      DEFAULT_ANON_KEY;

    this.client = createClient(url, key);
  }
}
