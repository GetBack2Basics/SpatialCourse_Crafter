import {
  auth,
  db,
  googleProvider,
  isFirebaseConfigured,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from '../lib/firebase';

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
  }
];

const INITIAL_TEAMS = [];

class AuthService {
  constructor() {
    this.listeners = [];
    this.pendingCodes = new Map();
    this.currentUser = this.loadSession();
    this.users = this.loadUsers();
    this.teams = this.loadTeams();

    // Initialize Firebase Auth Listener & Google OAuth Redirect Result Handler
    if (isFirebaseConfigured && auth) {
      this.initFirebase();
    }
  }

  async initFirebase() {
    try {
      // Handle Google OAuth Redirect Result
      const redirectRes = await getRedirectResult(auth);
      if (redirectRes && redirectRes.user) {
        await this.syncFirebaseUserToFirestore(redirectRes.user);
      }
    } catch (err) {
      console.warn("Firebase redirect auth notice:", err.message);
    }

    // Subscribe to Firebase Auth state changes
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const appUser = await this.syncFirebaseUserToFirestore(fbUser);
        this.saveSession(appUser);
      }
    });
  }

  async syncFirebaseUserToFirestore(fbUser) {
    if (!db) {
      return this.signIn(fbUser.email, fbUser.displayName);
    }

    const uid = fbUser.uid;
    const email = fbUser.email.toLowerCase();
    const userDocRef = doc(db, 'userAccounts', uid);

    let role = email === SUPER_ADMIN_EMAIL.toLowerCase() ? 'SUPER_ADMIN' : 'PLAYER';
    let status = email === SUPER_ADMIN_EMAIL.toLowerCase() ? 'approved' : 'pending';

    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const newRecord = {
          uid,
          email,
          displayName: fbUser.displayName || email.split('@')[0],
          role,
          isAdmin: role === 'SUPER_ADMIN' || role === 'ADMIN',
          status,
          emailVerified: fbUser.emailVerified || false,
          createdAt: serverTimestamp(),
          firstLoginAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          totalLogins: 1,
          activityCount: 0
        };
        await setDoc(userDocRef, newRecord);
      } else {
        const existingData = snap.data();
        role = existingData.role || (existingData.isAdmin ? 'ADMIN' : 'PLAYER');
        if (email === SUPER_ADMIN_EMAIL.toLowerCase()) role = 'SUPER_ADMIN';

        await updateDoc(userDocRef, {
          lastLoginAt: serverTimestamp(),
          totalLogins: (existingData.totalLogins || 0) + 1,
          emailVerified: fbUser.emailVerified || existingData.emailVerified || false
        });
      }
    } catch (e) {
      console.warn("Firestore user sync notice:", e.message);
    }

    const appUser = {
      uid,
      email,
      name: fbUser.displayName || email.split('@')[0],
      role,
      status,
      emailVerified: fbUser.emailVerified || false
    };

    let localMatch = this.users.find(u => u.email.toLowerCase() === email);
    if (!localMatch) {
      this.saveUsers([...this.users, appUser]);
    }

    return appUser;
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
    // Initial optimistic load
    let localUsers = INITIAL_USERS;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(USERS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localUsers = parsed;
          }
        }
      }
    } catch (e) {
      console.warn("Users DB load notice:", e);
    }
    
    // Async fetch from cloud database
    if (typeof window !== 'undefined' && window.location) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.users)) {
            this.users = data.users;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data.users));
            }
            this.notify();
          }
        }).catch(err => console.warn('Cloud sync failed for users:', err));
    }

    return localUsers;
  }

  saveUsers(users) {
    this.users = users;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    
    // Cloud sync
    if (typeof window !== 'undefined' && window.location) {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      }).catch(err => console.warn('Failed to sync users to cloud:', err));
    }
    
    this.notify();
  }

  loadTeams() {
    let localTeams = INITIAL_TEAMS;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localTeams = parsed;
          }
        }
      }
    } catch (e) {
      console.warn("Teams DB load notice:", e);
    }

    // Async fetch from cloud database
    if (typeof window !== 'undefined' && window.location) {
      fetch('/api/teams')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.teams)) {
            this.teams = data.teams;
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(data.teams));
            }
            this.notify();
          }
        }).catch(err => console.warn('Cloud sync failed for teams:', err));
    }

    return localTeams;
  }

  saveTeams(teams) {
    this.teams = teams;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
    }
    
    // Cloud sync
    if (typeof window !== 'undefined' && window.location) {
      fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teams)
      }).catch(err => console.warn('Failed to sync teams to cloud:', err));
    }

    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async syncCloudState() {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        fetch('/api/teams').then(r => r.json()).catch(() => null),
        fetch('/api/users').then(r => r.json()).catch(() => null)
      ]);

      if (teamsRes && teamsRes.success && Array.isArray(teamsRes.teams)) {
        this.teams = teamsRes.teams;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teamsRes.teams));
        }
      }

      if (usersRes && usersRes.success && Array.isArray(usersRes.users)) {
        this.users = usersRes.users;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersRes.users));
        }
      }

      this.notify();
      return { teams: this.teams, users: this.users };
    } catch (e) {
      console.warn("Cloud status sync notice:", e);
      return { teams: this.teams, users: this.users };
    }
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
  // 1. Send Email 6-Digit Verification Code / Link via Real Mailer API
  async sendVerificationCode(email, name = '') {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error("Please enter a valid email address.");
    }

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          email: cleanEmail,
          message: data.message,
          step: 'VERIFY_CODE'
        };
      } else if (data && data.message) {
        console.warn("Backend email dispatch error notice:", data.message);
      }
    } catch (err) {
      console.warn("Server email API notice:", err);
    }

    // Fallback: Direct Instant Sign-In when SMTP / Resend server mailer is unconfigured
    const user = this.signIn(cleanEmail, name);
    return {
      success: true,
      email: cleanEmail,
      message: `Signed in successfully as ${cleanEmail}!`,
      step: 'SIGNED_IN',
      user
    };
  }

  // 2. Verify 6-Digit Code & Authenticate Session
  async verifyCode(email, code) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail || !cleanCode) {
      throw new Error("Email and 6-digit verification code are required.");
    }

    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: cleanCode })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Invalid verification code.");
    }

    return this.signIn(cleanEmail);
  }

  // 3. Firebase Google OAuth Redirect Sign-In Handler
  async signInWithGoogleRedirect() {
    if (isFirebaseConfigured && auth && googleProvider) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    // Fallback for unconfigured dev environment
    return this.signInWithGoogle({ email: 'user@device-account.com', name: 'Google User' });
  }

  // 4. Firebase Email/Password Registration
  async registerWithEmailPassword(email, password, displayName = '') {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error("Please enter a valid email address.");
    }
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    if (isFirebaseConfigured && auth) {
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (credential.user) {
        await sendEmailVerification(credential.user);
        const appUser = await this.syncFirebaseUserToFirestore(credential.user);
        return { user: appUser, verificationSent: true };
      }
    }

    // Dev fallback
    const user = this.signIn(cleanEmail, displayName);
    return { user, verificationSent: false };
  }

  // 5. Firebase Email/Password Sign-In
  async signInWithEmailPassword(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error("Please enter a valid email address.");
    }

    if (isFirebaseConfigured && auth) {
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      if (credential.user) {
        const appUser = await this.syncFirebaseUserToFirestore(credential.user);
        return appUser;
      }
    }

    // Dev fallback
    return this.signIn(cleanEmail);
  }

  // 6. Firebase Password Reset Email
  async sendPasswordReset(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error("Please enter a valid email address.");
    }

    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true, message: `Password reset email sent to ${cleanEmail}.` };
    }

    return { success: true, message: `Demo mode: Password reset email simulated for ${cleanEmail}.` };
  }

  // 7. Google Sign-In Authentication Handler (Mock / Fallback profile builder)
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
    if (isFirebaseConfigured && auth) {
      firebaseSignOut(auth).catch(e => console.warn("Firebase signOut notice:", e));
    }
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

  // Admin User Creation & Deletion
  createUser(userData = {}) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can create new users.");
    }

    const cleanEmail = (userData.email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error("Please enter a valid email address.");
    }

    if (this.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`User with email "${cleanEmail}" already exists.`);
    }

    const newUser = {
      email: cleanEmail,
      name: userData.name || cleanEmail.split('@')[0],
      role: userData.role || 'PLAYER',
      assignedTeamIds: userData.assignedTeamIds || [],
      assignedCourseIds: userData.assignedCourseIds || [],
      organization: userData.organization || '',
      notes: userData.notes || '',
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...this.users, newUser];
    this.saveUsers(updatedUsers);
    return newUser;
  }

  deleteUser(userEmail) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can delete users.");
    }

    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      throw new Error("Cannot delete primary Super Admin account.");
    }

    const userToDelete = this.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!userToDelete) {
      throw new Error(`User "${userEmail}" not found.`);
    }

    const updatedUsers = this.users.filter(u => u.email.toLowerCase() !== cleanEmail);
    
    // Remove from team member lists
    const updatedTeams = this.teams.map(t => ({
      ...t,
      members: (t.members || []).filter(m => m.toLowerCase() !== cleanEmail),
      pendingRequests: (t.pendingRequests || []).filter(r => r.email.toLowerCase() !== cleanEmail)
    }));

    this.saveTeams(updatedTeams);
    this.saveUsers(updatedUsers);
    return userToDelete;
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

  requestToJoinTeam(teamId, userEmail, userName = '') {
    const cleanEmail = userEmail.trim().toLowerCase();
    const teamIndex = this.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      throw new Error("Team not found.");
    }

    const team = this.teams[teamIndex];
    const isMember = (team.members || []).some(m => m.toLowerCase() === cleanEmail);
    if (isMember) {
      throw new Error("You are already a member of this team.");
    }

    const pendingRequests = team.pendingRequests || [];
    const alreadyRequested = pendingRequests.some(r => r.email.toLowerCase() === cleanEmail);
    if (alreadyRequested) {
      throw new Error("Join request already pending approval for this team.");
    }

    const updatedTeam = {
      ...team,
      pendingRequests: [
        ...pendingRequests,
        {
          email: cleanEmail,
          name: userName || cleanEmail.split('@')[0],
          requestedAt: new Date().toISOString()
        }
      ]
    };

    const updatedTeams = [...this.teams];
    updatedTeams[teamIndex] = updatedTeam;
    this.saveTeams(updatedTeams);
    return updatedTeam;
  }

  approveJoinRequest(teamId, userEmail) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can approve team join requests.");
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const teamIndex = this.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      throw new Error("Team not found.");
    }

    const team = this.teams[teamIndex];
    const pendingRequests = (team.pendingRequests || []).filter(r => r.email.toLowerCase() !== cleanEmail);
    const members = Array.from(new Set([...(team.members || []), cleanEmail]));

    const updatedTeam = {
      ...team,
      members,
      pendingRequests
    };

    const updatedTeams = [...this.teams];
    updatedTeams[teamIndex] = updatedTeam;
    this.saveTeams(updatedTeams);

    // Sync member user's assignedTeamIds
    const updatedUsers = this.users.map(user => {
      if (user.email.toLowerCase() === cleanEmail) {
        let assignedTeamIds = user.assignedTeamIds || (user.teamId ? [user.teamId] : []);
        if (!assignedTeamIds.includes(teamId)) {
          assignedTeamIds = [...assignedTeamIds, teamId];
        }
        return {
          ...user,
          teamId: assignedTeamIds[0] || '',
          assignedTeamIds
        };
      }
      return user;
    });

    this.saveUsers(updatedUsers);
    return updatedTeam;
  }

  rejectJoinRequest(teamId, userEmail) {
    if (!this.isAdmin()) {
      throw new Error("Permission Denied: Only Admins can reject team join requests.");
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const teamIndex = this.teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      throw new Error("Team not found.");
    }

    const team = this.teams[teamIndex];
    const pendingRequests = (team.pendingRequests || []).filter(r => r.email.toLowerCase() !== cleanEmail);

    const updatedTeam = {
      ...team,
      pendingRequests
    };

    const updatedTeams = [...this.teams];
    updatedTeams[teamIndex] = updatedTeam;
    this.saveTeams(updatedTeams);
    return updatedTeam;
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
