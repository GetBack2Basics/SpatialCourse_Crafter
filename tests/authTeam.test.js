import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../src/services/authService.js';

describe('Stage 4: Real Authentication & RBAC (coreagc@gmail.com Super Admin)', () => {
  beforeEach(() => {
    // Reset session to default super admin
    authService.signIn('coreagc@gmail.com', 'George Corea');
  });

  it('should authenticate coreagc@gmail.com as Super Admin', () => {
    const user = authService.getCurrentUser();
    expect(user).toBeDefined();
    expect(user.email).toBe('coreagc@gmail.com');
    expect(user.role).toBe('SUPER_ADMIN');
    expect(authService.isSuperAdmin()).toBe(true);
    expect(authService.isAdmin()).toBe(true);
  });

  it('should allow Super Admin to grant Admin role to a user', () => {
    const targetEmail = 'william.dean@fungis.org';
    authService.setRole(targetEmail, 'ADMIN');

    const updatedUser = authService.users.find(u => u.email === targetEmail);
    expect(updatedUser).toBeDefined();
    expect(updatedUser.role).toBe('ADMIN');
  });

  it('should prevent non-Super Admin from granting Admin roles', () => {
    // Switch session to standard player
    authService.signIn('player@nsw.gov.au', 'Player User');
    expect(authService.isSuperAdmin()).toBe(false);

    expect(() => authService.setRole('someone@domain.org', 'ADMIN')).toThrow(/Permission Denied/);
  });

  it('should allow Admins to create teams and assign members', () => {
    authService.signIn('coreagc@gmail.com', 'George Corea');
    const team = authService.createTeam('Team Platypus (TAS)', ['member1@tas.gov.au', 'member2@tas.gov.au']);
    
    expect(team).toBeDefined();
    expect(team.name).toBe('Team Platypus (TAS)');
    expect(team.members.length).toBe(2);
  });

  it('should allow Admins to edit user profiles, emails, and details', () => {
    authService.signIn('william.dean@fungis.org', 'William Dean');
    authService.signIn('jordan@nsw.gov.au', 'Jordan');
    
    // Switch back to Admin
    authService.signIn('william.dean@fungis.org', 'William Dean');

    const updated = authService.updateUserProfile('jordan@nsw.gov.au', {
      name: 'Jordan Smith',
      email: 'jordan.smith@nsw.gov.au',
      organization: 'NSW Spatial Services',
      notes: 'Team Lead for Team Mango'
    });

    expect(updated).toBeDefined();
    expect(updated.name).toBe('Jordan Smith');
    expect(updated.email).toBe('jordan.smith@nsw.gov.au');
    expect(updated.organization).toBe('NSW Spatial Services');
    expect(updated.notes).toBe('Team Lead for Team Mango');

    // Check team members list updated old email to new email
    const mangoTeam = authService.teams.find(t => t.id === 'team-mango');
    if (mangoTeam) {
      expect(mangoTeam.members).toContain('jordan.smith@nsw.gov.au');
      expect(mangoTeam.members).not.toContain('jordan@nsw.gov.au');
    }
  });
});
