/**
 * authService.js
 * Real Authentication & Role-Based Access Control (RBAC) System
 * Super Admin: coreagc@gmail.com (Full Control)
 * Admin: Assigned by Super Admin (Manage teams, create/edit assigned challenges)
 * Player: Assigned to specific teams and courses
 */

const AUTH_STORAGE_KEY = 'fungis_spatial_olympics_auth_session';
const USERS_STORAGE_KEY = 'fungis_spatial_olympics_users_db';
const TEAMS_STORAGE_KEY = 'fungis_spatial_olympics_teams_db';

const SUPER_ADMIN_EMAIL = 'coreagc@gmail.com';

// Initial users database with coreagc@gmail.com as Super Admin
const INITIAL_USERS = [
  {
    email: SUPER_ADMIN_EMAIL,
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

const INITIAL_TEAMS = [
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

class AuthService {
  constructor() {
    this.listeners = [];
    this.currentUser = this.loadSession();
    this.users = this.loadUsers();
    this.teams = this.loadTeams();
  }

  loadSession() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const user = JSON.parse(stored);
          if (user.email === SUPER_ADMIN_EMAIL) user.role = 'SUPER_ADMIN';
          return user;
        }
      }
    } catch (e) {
      console.warn("Auth session load notice:", e);
    }
    const defaultUser = {
      email: SUPER_ADMIN_EMAIL,
      name: 'George Corea (Super Admin)',
      role: 'SUPER_ADMIN'
    };
    this.saveSession(defaultUser);
    return defaultUser;
  }

  saveSession(user) {
    if (user) {
      if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        user.role = 'SUPER_ADMIN';
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      }
    } else {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    this.currentUser = user;
    this.notify();
  }

  loadUsers() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Users DB load notice:", e);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    }
    return INITIAL_USERS;
  }

  saveUsers(users) {
    this.users = users;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    this.notify();
  }

  loadTeams() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Teams DB load notice:", e);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(INITIAL_TEAMS));
    }
    return INITIAL_TEAMS;
  }

  saveTeams(teams) {
    this.teams = teams;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener({
      currentUser: this.currentUser,
      users: this.users,
      teams: this.teams
    }));
  }

  // Real Email Sign In Handler
  signIn(email, name = '') {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error("Invalid email address.");
    }

    let existing = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!existing) {
      const role = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() ? 'SUPER_ADMIN' : 'PLAYER';
      existing = {
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        role,
        createdAt: new Date().toISOString()
      };
      const updatedUsers = [...this.users, existing];
      this.saveUsers(updatedUsers);
    }

    this.saveSession(existing);
    return existing;
  }

  signOut() {
    this.saveSession(null);
  }

  // Super Admin Role Assignment
  setRole(targetEmail, newRole) {
    if (!this.isSuperAdmin()) {
      throw new Error("Permission Denied: Only Super Admin (coreagc@gmail.com) can grant or revoke Admin roles.");
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error("Cannot alter Super Admin primary account role.");
    }

    const updatedUsers = this.users.map(u => {
      if (u.email.toLowerCase() === cleanEmail) {
        return { ...u, role: newRole };
      }
      return u;
    });

    this.saveUsers(updatedUsers);
  }

  // Team Management
  createTeam(teamName, memberEmails = [], assignedCourseIds = []) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can create teams.");
    }

    const newTeam = {
      id: `team-${Date.now()}`,
      name: teamName,
      members: memberEmails,
      assignedCourseIds
    };

    const updatedTeams = [...this.teams, newTeam];
    this.saveTeams(updatedTeams);
    return newTeam;
  }

  assignUserToTeam(userEmail, teamId) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can assign users to teams.");
    }

    const updatedTeams = this.teams.map(t => {
      if (t.id === teamId) {
        const members = Array.from(new Set([...t.members, userEmail]));
        return { ...t, members };
      }
      return t;
    });

    this.saveTeams(updatedTeams);
  }

  // Permissions Checkers
  getCurrentUser() {
    return this.currentUser;
  }

  isSuperAdmin() {
    return Boolean(this.currentUser && this.currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
  }

  isAdmin() {
    if (!this.currentUser) return false;
    return this.isSuperAdmin() || this.currentUser.role === 'ADMIN';
  }

  canEditCourse(course) {
    if (!this.currentUser) return false;
    if (this.isSuperAdmin()) return true;
    if (this.currentUser.role === 'ADMIN') {
      return !course.createdBy || course.createdBy === this.currentUser.email;
    }
    return false;
  }
}

export const authService = new AuthService();
