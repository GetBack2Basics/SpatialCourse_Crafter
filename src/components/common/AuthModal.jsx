import { useState } from 'react';
import { authService } from '../../services/authService';
import { UserCheck, LogOut, ShieldAlert, Plus, CheckCircle2, X, Edit3, User, Mail, Users, Building, FileText, MapPin } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, currentUser }) {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE' | 'USER_PROFILES' | 'SUPER_ADMIN' | 'TEAMS'
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Available sample courses list for assignment
  const AVAILABLE_COURSES = [
    { id: 'course-fungis-2026', name: 'FunGIS Spatial Olympics 2026 (Lake Macquarie)' },
    { id: 'course-rathmines-legacy', name: 'Rathmines Catalina Flying Boat Challenge' },
    { id: 'course-sydney-spatial', name: 'Sydney Harbour Spatial Survey' }
  ];

  // Super Admin Role Assign State
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState('ADMIN');

  // Team Create & Edit State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamMemberEmails, setNewTeamMemberEmails] = useState([]);
  const [newTeamCourseIds, setNewTeamCourseIds] = useState(['course-fungis-2026']);

  const [editingTeam, setEditingTeam] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamMemberEmails, setEditTeamMemberEmails] = useState([]);
  const [editTeamCourseIds, setEditTeamCourseIds] = useState([]);

  // Admin User Profile Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('PLAYER');
  const [editAssignedTeamIds, setEditAssignedTeamIds] = useState([]);
  const [editAssignedCourseIds, setEditAssignedCourseIds] = useState([]);
  const [editOrg, setEditOrg] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Auth Mode State (Email vs Code vs Google)
  const [authStep, setAuthStep] = useState('EMAIL'); // 'EMAIL' | 'VERIFY_CODE'
  const [codeInput, setCodeInput] = useState('');
  const [sentCode, setSentCode] = useState(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  if (!isOpen) return null;

  const isSuperAdmin = authService.isSuperAdmin();
  const isAdmin = authService.isAdmin();

  const handleGoogleSignIn = () => {
    setErrorMsg(null);
    try {
      // Direct Google Auth trigger / One Tap fallback
      const mockGoogleAccount = {
        email: emailInput && emailInput.includes('@') ? emailInput : 'participant.google@fungis.org',
        name: nameInput || 'Google Authenticated User',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
      };
      authService.signInWithGoogle(mockGoogleAccount);
      setSuccessMsg(`Signed in with Google as ${mockGoogleAccount.email}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!emailInput || !emailInput.includes('@')) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setIsSendingCode(true);
    try {
      const result = await authService.sendVerificationCode(emailInput);
      setSentCode(result.code);
      setAuthStep('VERIFY_CODE');
      setSuccessMsg(`Verification code sent to ${emailInput}! Check your inbox or enter code below.`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!codeInput) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }

    setIsVerifyingCode(true);
    try {
      await authService.verifyCode(emailInput, codeInput);
      setSuccessMsg(`Email verified! Signed in as ${emailInput}.`);
      setTimeout(() => {
        setSuccessMsg(null);
        setAuthStep('EMAIL');
        setCodeInput('');
        if (onClose) onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      authService.signIn(emailInput, nameInput);
      setSuccessMsg(`Signed in successfully as ${emailInput}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        if (onClose) onClose();
      }, 1200);
      setEmailInput('');
      setNameInput('');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleQuickSignIn = (email, name) => {
    setErrorMsg(null);
    try {
      authService.signIn(email, name);
      setSuccessMsg(`Switched profile to ${name} (${email})!`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleSignOut = () => {
    authService.signOut();
    setSuccessMsg("Signed out successfully.");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleGrantRole = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      authService.setRole(grantEmail, grantRole);
      setSuccessMsg(`Granted ${grantRole} role to ${grantEmail}!`);
      setGrantEmail('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateTeam = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      authService.createTeam(newTeamName, newTeamMemberEmails, newTeamCourseIds);
      setSuccessMsg(`Created team "${newTeamName}" with ${newTeamMemberEmails.length} members!`);
      setNewTeamName('');
      setNewTeamMemberEmails([]);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const startEditingTeam = (team) => {
    setEditingTeam(team);
    setEditTeamName(team.name || '');
    setEditTeamMemberEmails(team.members || []);
    setEditTeamCourseIds(team.assignedCourseIds || []);
  };

  const handleSaveTeam = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!editingTeam) return;
    try {
      authService.updateTeam(editingTeam.id, {
        name: editTeamName,
        members: editTeamMemberEmails,
        assignedCourseIds: editTeamCourseIds
      });
      setSuccessMsg(`Updated team "${editTeamName}"!`);
      setEditingTeam(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteTeam = (team) => {
    setErrorMsg(null);
    try {
      authService.deleteTeam(team.id);
      setSuccessMsg(`Deleted team "${team.name}".`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const startEditingUser = (user) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'PLAYER');
    setEditAssignedTeamIds(user.assignedTeamIds || (user.teamId ? [user.teamId] : []));
    setEditAssignedCourseIds(user.assignedCourseIds || []);
    setEditOrg(user.organization || '');
    setEditNotes(user.notes || '');
  };

  const handleSaveUserProfile = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!editingUser) return;

    try {
      authService.updateUserProfile(editingUser.email, {
        name: editName,
        email: editEmail,
        role: editRole,
        assignedTeamIds: editAssignedTeamIds,
        assignedCourseIds: editAssignedCourseIds,
        organization: editOrg,
        notes: editNotes
      });
      setSuccessMsg(`Successfully updated profile for ${editEmail}!`);
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const toggleItemInArray = (arr, item) => {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 max-w-2xl w-full border border-sky-500/40 rounded-3xl max-h-[92vh] overflow-y-auto space-y-5 bg-slate-950 text-slate-100 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sky-400" />
              <span>User Authentication, Team & Course Access Admin</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Configure Multi-Team & Multi-Course Assignments for Users & Groups</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 text-xs font-semibold flex-wrap gap-1">
          <button
            onClick={() => { setActiveTab('PROFILE'); setEditingUser(null); setEditingTeam(null); }}
            className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PROFILE' ? 'border-sky-400 text-sky-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Profile & Login
          </button>

          {isAdmin && (
            <button
              onClick={() => { setActiveTab('USER_PROFILES'); setEditingUser(null); setEditingTeam(null); }}
              className={`py-2 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'USER_PROFILES' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>User Profiles & Assignments</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => { setActiveTab('SUPER_ADMIN'); setEditingUser(null); setEditingTeam(null); }}
              className={`py-2 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'SUPER_ADMIN' ? 'border-purple-400 text-purple-300 font-bold' : 'border-transparent text-purple-400/70 hover:text-purple-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Super Admin Panel</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => { setActiveTab('TEAMS'); setEditingUser(null); setEditingTeam(null); }}
              className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'TEAMS' ? 'border-emerald-400 text-emerald-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Team & Course Manager
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Profile & Login */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-4">
            {currentUser ? (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Active Session</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isSuperAdmin ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    isAdmin ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    'bg-sky-950 text-sky-300 border border-sky-800'
                  }`}>
                    {currentUser.role || 'PLAYER'}
                  </span>
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-100">{currentUser.name || currentUser.email}</div>
                  <div className="text-xs text-sky-400">{currentUser.email}</div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <button
                    onClick={() => startEditingUser(currentUser)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile Details</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 font-mono">
                {/* 1. Google Account Sign-In Button */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Fast Sign In</div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Sign in with Google Account</span>
                  </button>
                </div>

                <div className="flex items-center my-3">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="px-3 text-[10px] uppercase font-bold text-slate-400">or sign in via email code / link</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                {/* 2. Email Sign-In with 6-Digit Verification Code */}
                {authStep === 'EMAIL' ? (
                  <form onSubmit={handleRequestCode} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="your.email@domain.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Display Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="Your Full Name"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingCode}
                      className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-xs text-slate-950 uppercase tracking-wider cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{isSendingCode ? "Sending Verification Code..." : "📧 Send Verification Code / Link"}</span>
                    </button>
                  </form>
                ) : (
                  /* Step 2: Verification Code Input Screen */
                  <form onSubmit={handleVerifyCode} className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-300 uppercase">Verification Code Sent</span>
                      <button
                        type="button"
                        onClick={() => setAuthStep('EMAIL')}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Change Email ({emailInput})
                      </button>
                    </div>

                    <p className="text-[11px] text-sky-200">
                      We sent a 6-digit verification code to <span className="font-bold text-white">{emailInput}</span>. Enter code below to sign in:
                    </p>

                    <div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="Enter 6-Digit Code (e.g. 123456)"
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value)}
                        className="w-full bg-slate-950 border-2 border-sky-400 rounded-xl px-3 py-3 text-center text-lg font-mono font-extrabold text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    </div>

                    {sentCode && (
                      <div className="p-2 rounded-lg bg-sky-900/60 border border-sky-700/50 text-[10px] text-sky-200 flex items-center justify-between">
                        <span>Demo / Auto Code: <strong className="font-mono text-cyan-300 text-xs">{sentCode}</strong></span>
                        <button
                          type="button"
                          onClick={() => setCodeInput(sentCode)}
                          className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                        >
                          Auto-Fill Code
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAuthStep('EMAIL')}
                        className="w-1/3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifyingCode}
                        className="w-2/3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-xs text-slate-950 uppercase tracking-wider cursor-pointer shadow-lg"
                      >
                        {isVerifyingCode ? "Verifying..." : "✅ Verify & Sign In"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Quick Switch Profiles for Workshop Demo */}
            <div className="pt-3 border-t border-slate-800 space-y-2 font-mono">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Quick Switch Accounts (Workshop Demo)</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickSignIn('coreagc@gmail.com', 'George Corea (Super Admin)')}
                  className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-left hover:bg-purple-900/80 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-purple-300">George Corea</div>
                  <div className="text-[10px] text-purple-400">coreagc@gmail.com (Super Admin)</div>
                </button>

                <button
                  onClick={() => handleQuickSignIn('william.dean@fungis.org', 'William Dean (Admin)')}
                  className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-left hover:bg-emerald-900/80 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-300">William Dean</div>
                  <div className="text-[10px] text-emerald-400">william.dean@fungis.org (Admin)</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Admin User Profiles Directory & Edit Form */}
        {activeTab === 'USER_PROFILES' && isAdmin && (
          <div className="space-y-4">
            {editingUser ? (
              /* Inline User Profile Editor Form for Admins */
              <form onSubmit={handleSaveUserProfile} className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-4 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>Edit User Profile & Assignments: {editingUser.email}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-100"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      User Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                      Role Classification
                    </label>
                    <select
                      value={editRole}
                      disabled={!isSuperAdmin}
                      onChange={e => setEditRole(e.target.value)}
                      className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 ${
                        !isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'focus:border-purple-400'
                      }`}
                    >
                      <option value="PLAYER">PLAYER (Participant)</option>
                      <option value="ADMIN">ADMIN (Course Planner & Team Manager)</option>
                      {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN (Full Privilege)</option>}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-indigo-400" />
                      Organization / State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FunGIS / NSW Spatial"
                      value={editOrg}
                      onChange={e => setEditOrg(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Multi-Select Teams Assignment */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <label className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Assign User to Teams (Multi-Team Assignment)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1">
                    {authService.teams.map(team => {
                      const isChecked = editAssignedTeamIds.includes(team.id);
                      return (
                        <label key={team.id} className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setEditAssignedTeamIds(toggleItemInArray(editAssignedTeamIds, team.id))}
                            className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-400"
                          />
                          <span className="font-bold text-[11px] truncate">{team.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Select Courses Assignment */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <label className="text-[11px] font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>Assign User Directly to Courses (Multi-Course Assignment)</span>
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto p-1">
                    {AVAILABLE_COURSES.map(c => {
                      const isChecked = editAssignedCourseIds.includes(c.id);
                      return (
                        <label key={c.id} className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setEditAssignedCourseIds(toggleItemInArray(editAssignedCourseIds, c.id))}
                            className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400"
                          />
                          <span className="font-bold text-[11px] truncate">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Admin Notes / Details
                  </label>
                  <input
                    type="text"
                    placeholder="Admin notes..."
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    Save User Profile & Assignments
                  </button>
                </div>
              </form>
            ) : (
              /* User Profiles Table / Directory */
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 uppercase">User Accounts & Profiles Directory</h4>
                  <span className="text-[10px] text-slate-400">{authService.users.length} Users Registered</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {authService.users.map(u => {
                    const userTeams = authService.teams.filter(t => (t.members || []).some(m => m.toLowerCase() === u.email.toLowerCase()));
                    return (
                      <div key={u.email} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-100 text-sm">{u.name || u.email}</div>
                          <div className="text-xs text-cyan-400">{u.email}</div>
                          {userTeams.length > 0 && (
                            <div className="text-[10px] text-emerald-400 mt-0.5">
                              Teams: {userTeams.map(t => t.name).join(', ')}
                            </div>
                          )}
                          {u.organization && <div className="text-[10px] text-slate-400 mt-0.5">Org: {u.organization}</div>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.email.toLowerCase() === 'coreagc@gmail.com' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            u.role === 'ADMIN' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}>
                            {u.role}
                          </span>

                          <button
                            type="button"
                            onClick={() => startEditingUser(u)}
                            className="p-1.5 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit User Profile, Email, and Team/Course Assignments"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Profile</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Super Admin Control Panel */}
        {activeTab === 'SUPER_ADMIN' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-500/40 text-xs text-purple-200 font-mono">
              <span className="font-bold text-purple-300 block uppercase mb-1">⚡ Super Admin Privilege (coreagc@gmail.com)</span>
              <span>Only coreagc@gmail.com can grant or revoke Admin roles across the Spatial Olympics platform.</span>
            </div>

            <form onSubmit={handleGrantRole} className="space-y-3 font-mono">
              <h4 className="text-xs font-bold text-slate-200 uppercase">Assign Admin Role to User</h4>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">User Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="target.user@domain.org"
                  value={grantEmail}
                  onChange={e => setGrantEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Role Permission</label>
                <select
                  value={grantRole}
                  onChange={e => setGrantRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                >
                  <option value="ADMIN">ADMIN (Can create/edit assigned challenges & manage teams)</option>
                  <option value="PLAYER">PLAYER (Participant runner access)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white uppercase tracking-wider cursor-pointer shadow-lg shadow-purple-500/20"
              >
                Grant Role Authorization
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Team Roster & Course Assignment Manager */}
        {activeTab === 'TEAMS' && isAdmin && (
          <div className="space-y-4 font-mono">
            {editingTeam ? (
              <form onSubmit={handleSaveTeam} className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase">Edit Team & Course Assignments: {editingTeam.name}</h4>
                  <button
                    type="button"
                    onClick={() => setEditingTeam(null)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-slate-100"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-bold">Team Name</label>
                  <input
                    type="text"
                    required
                    value={editTeamName}
                    onChange={e => setEditTeamName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-400"
                  />
                </div>

                {/* Dropdown Checklist of Registered Users */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-bold block">
                    Select Team Members (From Registered Users Directory)
                  </label>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                    {authService.users.map(u => {
                      const isChecked = editTeamMemberEmails.some(m => m.toLowerCase() === u.email.toLowerCase());
                      return (
                        <label key={u.email} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => setEditTeamMemberEmails(toggleItemInArray(editTeamMemberEmails, u.email))}
                              className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-400"
                            />
                            <span className="font-bold text-xs">{u.name || u.email}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">{u.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Multi-Select Course Checklist for Team */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-bold block">
                    Assign Team to Challenges / Courses
                  </label>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1.5">
                    {AVAILABLE_COURSES.map(c => {
                      const isChecked = editTeamCourseIds.includes(c.id);
                      return (
                        <label key={c.id} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => setEditTeamCourseIds(toggleItemInArray(editTeamCourseIds, c.id))}
                              className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400"
                            />
                            <span className="font-bold text-xs">{c.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingTeam(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold uppercase tracking-wider"
                  >
                    Save Team & Assignments
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase">Create New Competition Team</h4>
                
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Team Kookaburra (VIC)"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>

                {/* Dropdown Checklist of Registered Users */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-bold block">
                    Select Members (Dropdown Checklist of Registered Users)
                  </label>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                    {authService.users.map(u => {
                      const isChecked = newTeamMemberEmails.includes(u.email);
                      return (
                        <label key={u.email} className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}>
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => setNewTeamMemberEmails(toggleItemInArray(newTeamMemberEmails, u.email))}
                              className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-400"
                            />
                            <span className="font-bold text-xs">{u.name || u.email}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">{u.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create & Register Team</span>
                </button>
              </form>
            )}

            <div className="space-y-2 font-mono text-xs">
              <h4 className="font-bold text-slate-300 uppercase">Active Teams Roster</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {authService.teams.map(t => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span className="text-sm">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{t.members.length} Members</span>
                        <button
                          type="button"
                          onClick={() => startEditingTeam(t)}
                          className="px-2 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-bold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeam(t)}
                          className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[10px] font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-300">Members: {t.members.join(', ') || 'No members assigned'}</div>
                    {t.assignedCourseIds && t.assignedCourseIds.length > 0 && (
                      <div className="text-[10px] text-cyan-400">Assigned Courses: {t.assignedCourseIds.join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
