import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@ticketflow/data-access';
import type { EventStaffMember, StaffInvitationWithRelations } from '@ticketflow/models';

@Injectable({ providedIn: 'root' })
export class EventStaffService {
  private readonly supabase = inject(SupabaseService).client;

  /**
   * Fetch all staff members assigned to an event with their profiles.
   */
  async getEventStaff(eventId: string): Promise<EventStaffMember[]> {
    const { data, error } = await this.supabase
      .from('event_staff')
      .select('*, profiles(id, display_name, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching staff for event ${eventId}:`, error);
      throw error;
    }

    return (data || []) as EventStaffMember[];
  }

  /**
   * Fetch pending email invitations for an event.
   */
  async getEventInvitations(eventId: string): Promise<StaffInvitationWithRelations[]> {
    const { data, error } = await this.supabase
      .from('staff_invitations')
      .select('*, events(id, name, event_date, flyer_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching invitations for event ${eventId}:`, error);
      throw error;
    }

    return (data || []) as StaffInvitationWithRelations[];
  }

  /**
   * Create or re-send an invitation to a staff member by email.
   */
  async inviteStaff(
    eventId: string,
    email: string,
    invitedBy?: string
  ): Promise<StaffInvitationWithRelations> {
    const cleanEmail = email.trim().toLowerCase();

    // Insert or update the invitation
    const { data, error } = await this.supabase
      .from('staff_invitations')
      .upsert(
        {
          event_id: eventId,
          email: cleanEmail,
          invited_by: invitedBy || null,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'event_id,email' }
      )
      .select('*, events(id, name, event_date, flyer_url)')
      .single();

    if (error) {
      console.error('Error creating staff invitation:', error);
      throw error;
    }

    // Trigger email edge function if available
    try {
      await this.supabase.functions.invoke('send-staff-invite', {
        body: {
          eventId,
          email: cleanEmail,
          token: data.token,
          invitedBy,
        },
      });
    } catch (edgeErr) {
      console.warn('Edge function send-staff-invite invocation:', edgeErr);
    }

    return data as StaffInvitationWithRelations;
  }

  /**
   * Revoke staff member access from an event.
   */
  async revokeStaff(staffId: string): Promise<void> {
    const { error } = await this.supabase
      .from('event_staff')
      .update({ status: 'revoked' })
      .eq('id', staffId);

    if (error) {
      console.error(`Error revoking staff ${staffId}:`, error);
      throw error;
    }
  }

  /**
   * Remove or cancel an invitation.
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('staff_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error(`Error revoking invitation ${invitationId}:`, error);
      throw error;
    }
  }

  /**
   * Look up invitation by secure token (public for accept-invite page).
   */
  async getInvitationByToken(token: string): Promise<StaffInvitationWithRelations | null> {
    const { data, error } = await this.supabase
      .from('staff_invitations')
      .select('*, events(id, name, event_date, flyer_url)')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invitation by token:', error);
      throw error;
    }

    return data as StaffInvitationWithRelations | null;
  }

  /**
   * Accept an invitation with the logged-in user account.
   */
  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const invite = await this.getInvitationByToken(token);

    if (!invite) {
      return { success: false, error: 'Invitación no encontrada o token inválido.' };
    }

    if (invite.status === 'revoked' || invite.status === 'expired') {
      return { success: false, error: 'Esta invitación ha sido revocada o expiró.' };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'Esta invitación ha expirado.' };
    }

    // Check if user already has an active assignment for another event
    const { data: activeAssignments } = await this.supabase
      .from('event_staff')
      .select('id, event_id, events(name)')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    const otherActive = (activeAssignments || []).find((a) => a.event_id !== invite.event_id);
    if (otherActive) {
      const eventName = (otherActive as unknown as { events?: { name?: string } }).events?.name || 'otro evento';
      return {
        success: false,
        error: `Ya tienes una asignación activa para el evento "${eventName}". Un validador solo puede trabajar en un evento a la vez.`,
      };
    }

    // 1. Assign 'doorman' role to user if not present
    const { data: roles } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const hasDoormanRole = (roles || []).some((r: { role: string }) => r.role === 'doorman');
    if (!hasDoormanRole) {
      await this.supabase.from('user_roles').insert({ user_id: userId, role: 'doorman' });
    }

    // 2. Upsert event_staff record
    const { error: staffErr } = await this.supabase
      .from('event_staff')
      .upsert(
        {
          event_id: invite.event_id,
          user_id: userId,
          invited_by: invite.invited_by,
          status: 'accepted',
        },
        { onConflict: 'event_id,user_id' }
      );

    if (staffErr) {
      console.error('Error inserting event_staff:', staffErr);
      return { success: false, error: 'Error al registrar la asignación de personal.' };
    }

    // 3. Mark invitation accepted
    await this.supabase
      .from('staff_invitations')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    return { success: true, eventId: invite.event_id };
  }
}
