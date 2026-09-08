import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type {
  PlatformGlobalMetrics,
  SuperAdminUserItem,
  AdminVenueModerationItem,
  RoleType,
} from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly supabase = inject(SupabaseService).client;

  /** Fetch global platform business KPIs */
  async getGlobalMetrics(): Promise<PlatformGlobalMetrics> {
    const { data, error } = await this.supabase.rpc('get_global_platform_metrics');

    if (error) {
      console.error('Error fetching global platform metrics:', error);
      throw error;
    }

    return (data || {
      total_gmv: 0,
      total_platform_commission: 0,
      total_orders_count: 0,
      total_tickets_sold: 0,
      total_events_count: 0,
      active_events_count: 0,
      total_venues_count: 0,
      verified_venues_count: 0,
      total_artists_count: 0,
      total_users_count: 0,
    }) as PlatformGlobalMetrics;
  }

  /** Fetch all registered users with their roles */
  async getAllUsers(): Promise<SuperAdminUserItem[]> {
    const { data, error } = await this.supabase.rpc('get_all_users_with_roles');

    if (error) {
      console.error('Error fetching users with roles:', error);
      throw error;
    }

    return (data || []) as SuperAdminUserItem[];
  }

  /** Assign or revoke a specific role for a target user */
  async setUserRole(
    targetUserId: string,
    role: RoleType,
    shouldHave: boolean
  ): Promise<void> {
    const { error } = await this.supabase.rpc('admin_set_user_role', {
      p_target_user_id: targetUserId,
      p_role: role,
      p_should_have: shouldHave,
    });

    if (error) {
      console.error(`Error updating role ${role} for user ${targetUserId}:`, error);
      throw error;
    }
  }

  /** Fetch all venues across all artists with aggregate stats for moderation */
  async getVenuesForModeration(): Promise<AdminVenueModerationItem[]> {
    const { data, error } = await this.supabase.rpc('get_all_venues_for_moderation');

    if (error) {
      console.error('Error fetching venues for moderation:', error);
      throw error;
    }

    return (data || []) as AdminVenueModerationItem[];
  }

  /** Toggle venue verified status */
  async toggleVenueVerification(
    venueId: string,
    verified: boolean
  ): Promise<void> {
    const { error } = await this.supabase.rpc('admin_toggle_venue_verification', {
      p_venue_id: venueId,
      p_verified: verified,
    });

    if (error) {
      console.error(`Error updating venue verification for ${venueId}:`, error);
      throw error;
    }
  }
}
