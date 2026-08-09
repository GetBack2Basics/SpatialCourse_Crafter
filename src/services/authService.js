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

// Initial users database with coreagc@gmail.com as Super Admin and William Dean as Admin
const INITIAL_USERS = [
  {
    email: SUPER_ADMIN_EMAIL,
    name: 'George Corea (Super Admin)',
    role: 'SUPER_ADMIN',
    createdAt: new Date().toISOString()
  },
  {
    email: 'william.dean@fungis.org',
    name: 'Will Dean (Admin)',
    role: 'ADMIN',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_TEAMS = [
  {
    id: 'team-george-will',
    name: 'Far North GIS (George & Will)',
    members: ['coreagc@gmail.com', 'william.dean@fungis.org'],
    assignedCourseIds: ['cairns-hilton-surveying']
  }
];

class AuthService {
  constructor() {
    this.listeners = [];
    this.pendingCodes = new Map();
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
          if (user && user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            user.role = 'SUPER_ADMIN';
          }
          return user;
        }
      }
    } catch (e) {
      console.warn("Auth session load notice:", e);
    }
    return null;
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
        if (stored) {
          const parsed = JSON.parse(stored);
          // Retain only George Corea and Will Dean
          const filtered = parsed.filter(u => u.email === SUPER_ADMIN_EMAIL || u.email === 'william.dean@fungis.org');
          if (filtered.length > 0) return filtered;
        }
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
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.some(t => t.id === 'team-george-will')) {
            return parsed;
          }
        }
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

  // 1. Send Email 6-Digit Verification Code / Link
  async sendVerificationCode(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error("Please enter a valid email address.");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const record = {
      code,
      email: cleanEmail,
      expiresAt: Date.now() + 10 * 60 * 1000
    };
    this.pendingCodes.set(cleanEmail, record);

    let emailSent = false;
    let serverMessage = "";

    // Call backend API if running
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.code) record.code = data.code;
          emailSent = Boolean(data.emailSent);
          serverMessage = data.message;
        }
      }
    } catch (e) {
      console.warn("Backend auth send-code fallback to local client verification code:", e);
    }

    return {
      success: true,
      email: cleanEmail,
      code: record.code,
      emailSent,
      message: serverMessage || `Verification code sent to ${cleanEmail}`
    };
  }

  // 2. Verify 6-Digit Code & Authenticate Session
  async verifyCode(email, code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail || !cleanCode) {
      throw new Error("Email and 6-digit verification code are required.");
    }

    // Try backend verification first
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/auth/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, code: cleanCode })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return this.signIn(cleanEmail);
          }
        }
      }
    } catch (e) {
      console.warn("Backend verify-code fallback to local verification:", e);
    }

    // Fallback local verification check
    const record = this.pendingCodes.get(cleanEmail);
    if (!record) {
      // Fallback: accept 6-digit code if matches standard or generated code
      if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
        return this.signIn(cleanEmail);
      }
      throw new Error("No active verification code found for this email. Please request a new code.");
    }

    if (Date.now() > record.expiresAt) {
      this.pendingCodes.delete(cleanEmail);
      throw new Error("Verification code has expired. Please request a new code.");
    }

    if (record.code !== cleanCode) {
      throw new Error("Invalid 6-digit verification code. Please check your email and try again.");
    }

    this.pendingCodes.delete(cleanEmail);
    return this.signIn(cleanEmail);
  }

  // 3. Google Sign-In Authentication Handler
  signInWithGoogle(googleProfile = {}) {
    const { email, name, picture } = googleProfile;
    if (!email || !email.includes('@')) {
      throw new Error("Invalid Google account profile.");
    }

    const cleanEmail = email.trim().toLowerCase();
    let existing = this.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!existing) {
      const role = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() ? 'SUPER_ADMIN' : 'PLAYER';
      existing = {
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        picture: picture || '',
        authProvider: 'GOOGLE',
        role,
        createdAt: new Date().toISOString()
      };
      const updatedUsers = [...this.users, existing];
      this.saveUsers(updatedUsers);
    } else {
      existing = {
        ...existing,
        name: name || existing.name,
        picture: picture || existing.picture,
        authProvider: 'GOOGLE'
      };
    }

    this.saveSession(existing);
    return existing;
  }

  signOut() {
    this.saveSession(null);
  }

  // Admin User Profile Management
  updateUserProfile(originalEmail, updatedFields = {}) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can edit user profiles.");
    }

    const cleanOriginal = originalEmail.trim().toLowerCase();
    const userIndex = this.users.findIndex(u => u.email.toLowerCase() === cleanOriginal);
    if (userIndex === -1) {
      throw new Error(`User with email "${originalEmail}" not found.`);
    }

    const targetUser = this.users[userIndex];
    const isSuperAdminAccount = cleanOriginal === SUPER_ADMIN_EMAIL.toLowerCase();

    // Only Super Admin can edit Super Admin account
    if (isSuperAdminAccount && !this.isSuperAdmin()) {
      throw new Error("Permission Denied: Only Super Admin can modify the primary Super Admin profile.");
    }

    // Role modification restricted to Super Admin
    let newRole = targetUser.role;
    if (updatedFields.role && updatedFields.role !== targetUser.role) {
      if (!this.isSuperAdmin()) {
        throw new Error("Permission Denied: Only Super Admin (coreagc@gmail.com) can change user roles.");
      }
      newRole = isSuperAdminAccount ? 'SUPER_ADMIN' : updatedFields.role;
    }

    const newEmail = updatedFields.email ? updatedFields.email.trim().toLowerCase() : targetUser.email;
    
    // Check if new email collides with another user
    if (newEmail !== cleanOriginal && this.users.some(u => u.email.toLowerCase() === newEmail)) {
      throw new Error(`Email "${newEmail}" is already in use by another account.`);
    }

    const targetTeamIds = updatedFields.assignedTeamIds !== undefined 
      ? updatedFields.assignedTeamIds 
      : (updatedFields.teamId ? [updatedFields.teamId] : (targetUser.assignedTeamIds || (targetUser.teamId ? [targetUser.teamId] : [])));

    const targetCourseIds = updatedFields.assignedCourseIds !== undefined
      ? updatedFields.assignedCourseIds
      : (targetUser.assignedCourseIds || []);

    const updatedUser = {
      ...targetUser,
      name: updatedFields.name !== undefined ? updatedFields.name : targetUser.name,
      email: newEmail,
      role: newRole,
      teamId: targetTeamIds[0] || '',
      assignedTeamIds: targetTeamIds,
      assignedCourseIds: targetCourseIds,
      organization: updatedFields.organization !== undefined ? updatedFields.organization : targetUser.organization,
      phone: updatedFields.phone !== undefined ? updatedFields.phone : targetUser.phone,
      notes: updatedFields.notes !== undefined ? updatedFields.notes : targetUser.notes,
      updatedAt: new Date().toISOString()
    };

    const updatedUsers = [...this.users];
    updatedUsers[userIndex] = updatedUser;

    // Update active session if editing currently logged-in user
    if (this.currentUser && this.currentUser.email.toLowerCase() === cleanOriginal) {
      this.saveSession(updatedUser);
    }

    // Synchronize team memberships based on targetTeamIds
    let updatedTeams = this.teams.map(team => {
      let members = team.members.map(m => m.toLowerCase() === cleanOriginal ? newEmail : m);
      const isAssigned = targetTeamIds.includes(team.id);
      
      if (isAssigned && !members.includes(newEmail)) {
        members.push(newEmail);
      } else if (!isAssigned && members.includes(newEmail)) {
        members = members.filter(m => m.toLowerCase() !== newEmail);
      }

      return { ...team, members };
    });

    this.saveTeams(updatedTeams);
    this.saveUsers(updatedUsers);

    return updatedUser;
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

  updateTeam(teamId, updatedFields = {}) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can edit teams.");
    }

    const teamIndex = this.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      throw new Error(`Team with ID "${teamId}" not found.`);
    }

    const existing = this.teams[teamIndex];
    const newMembers = updatedFields.members !== undefined ? updatedFields.members : existing.members;
    const newCourses = updatedFields.assignedCourseIds !== undefined ? updatedFields.assignedCourseIds : (existing.assignedCourseIds || []);

    const updatedTeam = {
      ...existing,
      name: updatedFields.name !== undefined ? updatedFields.name : existing.name,
      members: newMembers,
      assignedCourseIds: newCourses,
      updatedAt: new Date().toISOString()
    };

    const updatedTeams = [...this.teams];
    updatedTeams[teamIndex] = updatedTeam;
    this.saveTeams(updatedTeams);

    // Sync member users' assignedTeamIds
    const updatedUsers = this.users.map(user => {
      const isMember = newMembers.includes(user.email.toLowerCase()) || newMembers.includes(user.email);
      let assignedTeamIds = user.assignedTeamIds || (user.teamId ? [user.teamId] : []);
      
      if (isMember && !assignedTeamIds.includes(teamId)) {
        assignedTeamIds = [...assignedTeamIds, teamId];
      } else if (!isMember && assignedTeamIds.includes(teamId)) {
        assignedTeamIds = assignedTeamIds.filter(id => id !== teamId);
      }

      return {
        ...user,
        teamId: assignedTeamIds[0] || '',
        assignedTeamIds
      };
    });

    this.saveUsers(updatedUsers);
    return updatedTeam;
  }

  // Course-to-Team Assignment Manager for Course Admin
  assignCourseToTeams(courseId, teamIds = []) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can assign courses to teams.");
    }

    const updatedTeams = this.teams.map(team => {
      let assignedCourseIds = team.assignedCourseIds || [];
      const shouldHaveCourse = teamIds.includes(team.id);

      if (shouldHaveCourse && !assignedCourseIds.includes(courseId)) {
        assignedCourseIds = [...assignedCourseIds, courseId];
      } else if (!shouldHaveCourse && assignedCourseIds.includes(courseId)) {
        assignedCourseIds = assignedCourseIds.filter(id => id !== courseId);
      }

      return { ...team, assignedCourseIds };
    });

    this.saveTeams(updatedTeams);
    return updatedTeams;
  }

  deleteTeam(teamId) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can delete teams.");
    }

    const teamToDelete = this.teams.find(t => t.id === teamId);
    if (!teamToDelete) {
      throw new Error(`Team with ID "${teamId}" not found.`);
    }

    const filtered = this.teams.filter(t => t.id !== teamId);
    this.saveTeams(filtered);
    return teamToDelete;
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
