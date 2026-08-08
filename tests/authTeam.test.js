import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../src/services/authService.js';

describe('Stage 4: Real Authentication & RBAC (coreagc@gmail.com Super Admin)', () => {
  beforeEach(() => {
    // Reset DB state for clean tests
    authService.users = [
      {
        email: 'coreagc@gmail.com',
        name: 'George Corea (Super Admin)',
        role: 'SUPER_ADMIN',
        createdAt: new Date().toISOString()
      },
      {
        email: 'william.dean@fungis.org',
        name: 'William Dean (Admin)',
        role: 'ADMIN',
        createdAt: new Date().toISOString()
      },
      {
        email: 'jordan@nsw.gov.au',
        name: 'Jordan (Team Mango)',
        role: 'PLAYER',
        teamId: 'team-mango',
        createdAt: new Date().toISOString()
      }
    ];

    authService.teams = [
      {
        id: 'team-mango',
        name: 'Team Mango (NSW)',
        members: ['jordan@nsw.gov.au', 'taylor@nsw.gov.au'],
        assignedCourseIds: ['course-1', 'course-2']
      },
      {
        id: 'team-wombat',
        name: 'Team Wombat (QLD)',
        members: ['sarah@qld.gov.au', 'ken@qld.gov.au'],
        assignedCourseIds: ['course-1']
      }
    ];

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

  it('should allow Admins to edit and delete teams', () => {
    authService.signIn('coreagc@gmail.com', 'George Corea');
    const newTeam = authService.createTeam('Team Echidna (SA)', ['user1@sa.gov.au']);
    
    // Edit team
    const updatedTeam = authService.updateTeam(newTeam.id, {
      name: 'Team Echidna Gold (SA)',
      members: ['user1@sa.gov.au', 'user2@sa.gov.au']
    });
    expect(updatedTeam.name).toBe('Team Echidna Gold (SA)');
    expect(updatedTeam.members.length).toBe(2);

    // Delete team
    authService.deleteTeam(newTeam.id);
    const found = authService.teams.find(t => t.id === newTeam.id);
    expect(found).toBeUndefined();
  });

  it('should allow assigning users and teams to multiple teams and courses bi-directionally', () => {
    authService.signIn('coreagc@gmail.com', 'George Corea');
    
    // Assign Jordan to multiple teams & courses
    authService.updateUserProfile('jordan@nsw.gov.au', {
      assignedTeamIds: ['team-mango', 'team-wombat'],
      assignedCourseIds: ['course-fungis-2026', 'course-rathmines-legacy']
    });

    const jordan = authService.users.find(u => u.email === 'jordan@nsw.gov.au');
    expect(jordan.assignedTeamIds).toEqual(['team-mango', 'team-wombat']);
    expect(jordan.assignedCourseIds).toEqual(['course-fungis-2026', 'course-rathmines-legacy']);

    // Check bi-directional sync in team members
    const wombat = authService.teams.find(t => t.id === 'team-wombat');
    expect(wombat.members).toContain('jordan@nsw.gov.au');

    // Assign courses to teams via Course Admin
    authService.assignCourseToTeams('course-sydney-spatial', ['team-mango', 'team-wombat']);
    const mango = authService.teams.find(t => t.id === 'team-mango');
    expect(mango.assignedCourseIds).toContain('course-sydney-spatial');
  });
});
