import { useState } from 'react';
import { authService } from '../../services/authService';
import { UserCheck, LogOut, ShieldAlert, Plus, CheckCircle2, X, Edit3, User, Mail, Users, Building, FileText } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, currentUser }) {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE' | 'USER_PROFILES' | 'SUPER_ADMIN' | 'TEAMS'
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Super Admin Role Assign State
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState('ADMIN');

  // Team Create State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamMembers, setNewTeamMembers] = useState('');

  // Admin User Profile Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('PLAYER');
  const [editTeamId, setEditTeamId] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin = authService.isSuperAdmin();
  const isAdmin = authService.isAdmin();

  const handleSignIn = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      authService.signIn(emailInput, nameInput);
      setSuccessMsg(`Signed in successfully as ${emailInput}!`);
      setTimeout(() => setSuccessMsg(null), 3000);
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
      const members = newTeamMembers.split(',').map(m => m.trim()).filter(Boolean);
      authService.createTeam(newTeamName, members);
      setSuccessMsg(`Created team "${newTeamName}" with ${members.length} members!`);
      setNewTeamName('');
      setNewTeamMembers('');
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
    setEditTeamId(user.teamId || '');
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
        teamId: editTeamId,
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel p-6 max-w-xl w-full border border-sky-500/40 rounded-3xl max-h-[90vh] overflow-y-auto space-y-5 bg-slate-950 text-slate-100 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-sky-400" />
              <span>User Authentication & Admin Profile Manager</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Spatial Olympics 2026 Admin User & Profile Management</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 text-xs font-semibold flex-wrap gap-1">
          <button
            onClick={() => { setActiveTab('PROFILE'); setEditingUser(null); }}
            className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PROFILE' ? 'border-sky-400 text-sky-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Profile & Login
          </button>

          {isAdmin && (
            <button
              onClick={() => { setActiveTab('USER_PROFILES'); setEditingUser(null); }}
              className={`py-2 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'USER_PROFILES' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Admin User Directory & Edit</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => { setActiveTab('SUPER_ADMIN'); setEditingUser(null); }}
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
              onClick={() => { setActiveTab('TEAMS'); setEditingUser(null); }}
              className={`py-2 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'TEAMS' ? 'border-emerald-400 text-emerald-300 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Team Roster Manager
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
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 font-bold text-xs text-slate-950 uppercase tracking-wider cursor-pointer"
                >
                  Sign In / Authenticate
                </button>
              </form>
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
              <form onSubmit={handleSaveUserProfile} className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>Edit User Profile: {editingUser.email}</span>
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
                    {!isSuperAdmin && <span className="text-[9px] text-slate-500 block mt-0.5">Role editing requires Super Admin</span>}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      Assigned Competition Team
                    </label>
                    <select
                      value={editTeamId}
                      onChange={e => setEditTeamId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="">No Team Assigned</option>
                      {authService.teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
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

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Admin Notes / Details
                    </label>
                    <input
                      type="text"
                      placeholder="Admin notes or team role..."
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
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
                    Save User Profile
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
                  {authService.users.map(u => (
                    <div key={u.email} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-100 text-sm">{u.name || u.email}</div>
                        <div className="text-xs text-cyan-400">{u.email}</div>
                        {u.organization && <div className="text-[10px] text-slate-400 mt-0.5">Org: {u.organization}</div>}
                        {u.notes && <div className="text-[10px] text-amber-300/80 italic mt-0.5">Note: {u.notes}</div>}
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
                          title="Edit User Profile, Email, and Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
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

            <form onSubmit={handleGrantRole} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">Assign Admin Role to User</h4>
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

            <div className="space-y-2 font-mono text-xs">
              <h4 className="font-bold text-slate-300 uppercase">Registered Users Directory</h4>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {authService.users.map(u => (
                  <div key={u.email} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold block text-slate-200">{u.name || u.email}</span>
                      <span className="text-[10px] text-slate-400">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.email.toLowerCase() === 'coreagc@gmail.com' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        u.role === 'ADMIN' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}>
                        {u.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('USER_PROFILES'); startEditingUser(u); }}
                        className="px-2 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-bold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Team Roster Manager */}
        {activeTab === 'TEAMS' && isAdmin && (
          <div className="space-y-4">
            <form onSubmit={handleCreateTeam} className="space-y-3 font-mono">
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

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Member Email Addresses (Comma separated)</label>
                <input
                  type="text"
                  placeholder="alex@vic.gov.au, mina@vic.gov.au"
                  value={newTeamMembers}
                  onChange={e => setNewTeamMembers(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create & Register Team</span>
              </button>
            </form>

            <div className="space-y-2 font-mono text-xs">
              <h4 className="font-bold text-slate-300 uppercase">Active Teams Roster</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {authService.teams.map(t => (
                  <div key={t.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-300">
                      <span>{t.name}</span>
                      <span className="text-[10px] text-slate-400">{t.members.length} Members</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Members: {t.members.join(', ') || 'No members assigned'}</div>
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
