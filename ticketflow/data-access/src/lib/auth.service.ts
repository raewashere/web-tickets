import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type { RoleType } from '@ticketflow/models';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: RoleType[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  /** Internal mutable signal */
  private readonly _state = signal<AuthState>({
    user: null,
    session: null,
    loading: true,
    roles: [],
  });

  // ─── Public read-only signals ──────────────────────────────────────────────
  readonly state = this._state.asReadonly();
  readonly user = computed(() => this._state().user);
  readonly session = computed(() => this._state().session);
  readonly isLoading = computed(() => this._state().loading);
  readonly isAuthenticated = computed(() => this._state().user !== null);
  readonly roles = computed(() => this._state().roles);
  readonly isArtist = computed(() => this._state().roles.includes('artist'));
  readonly isAdmin = computed(() => this._state().roles.includes('admin'));

  constructor() {
    this.init();
  }

  // ─── Initialisation ────────────────────────────────────────────────────────

  private async init(): Promise<void> {
    // Rehydrate from an existing session (e.g. after page reload)
    const {
      data: { session },
    } = await this.supabase.client.auth.getSession();

    if (session) {
      const roles = await this.fetchRoles(session.user.id);
      this._state.set({ user: session.user, session, loading: false, roles });
    } else {
      this._state.set({ user: null, session: null, loading: false, roles: [] });
    }

    // React to future auth changes (login, logout, token refresh)
    this.supabase.client.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const roles = await this.fetchRoles(session.user.id);
        this._state.set({ user: session.user, session, loading: false, roles });
      } else {
        this._state.set({
          user: null,
          session: null,
          loading: false,
          roles: [],
        });
      }
    });
  }

  private async fetchRoles(userId: string): Promise<RoleType[]> {
    const { data } = await this.supabase.client
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    return (data ?? []).map((r: { role: RoleType }) => r.role);
  }

  /** Wait until initial auth check finishes */
  async waitForAuthReady(): Promise<AuthState> {
    if (!this._state().loading) {
      return this._state();
    }
    return new Promise((resolve) => {
      const check = () => {
        if (!this._state().loading) {
          resolve(this._state());
        } else {
          setTimeout(check, 30);
        }
      };
      check();
    });
  }

  /** Get the artist ID associated with the current user if one exists */
  async getCurrentArtistId(): Promise<string | null> {
    const user = this.user();
    if (!user) return null;
    const { data } = await this.supabase.client
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    return data?.id ?? null;
  }

  // ─── Auth actions ──────────────────────────────────────────────────────────

  /** Register a new user and assign them a role after confirmation. */
  async register(
    email: string,
    password: string,
    displayName: string,
    role: RoleType = 'customer'
  ): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName, display_name: displayName, role } },
    });
    return { error };
  }

  /** Sign in with email + password. */
  async login(
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> {
    const { error } =
      await this.supabase.client.auth.signInWithPassword({
        email,
        password,
      });
    return { error };
  }

  /** Sign in or register with Google OAuth. */
  async signInWithGoogle(
    role: RoleType = 'customer',
    returnUrl?: string
  ): Promise<{ error: AuthError | null }> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = returnUrl
      ? (returnUrl.startsWith('http') ? returnUrl : `${origin}${returnUrl.startsWith('/') ? '' : '/'}${returnUrl}`)
      : `${origin}/`;

    const { error } = await this.supabase.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  }

  /** Sign out and redirect to login page. */
  async logout(): Promise<void> {
    await this.supabase.client.auth.signOut();
    await this.router.navigate(['/login']);
  }

  /** Insert a role for a user (called after registration). */
  async assignRole(
    userId: string,
    role: RoleType
  ): Promise<{ error: unknown }> {
    const { error } = await this.supabase.client
      .from('user_roles')
      .insert({ user_id: userId, role });
    return { error };
  }
}

