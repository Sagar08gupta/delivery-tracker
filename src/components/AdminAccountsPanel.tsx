/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { Shield, User as UserIcon, Lock, Key, Edit2, Trash2, Check, X, Plus, Search, RefreshCw, Layers } from 'lucide-react';
import { User } from '../types';
import { SEEDED_USERS } from '../initialData';
import { hashPassword } from '../utils/hash';

interface AdminAccountsPanelProps {
  currentUser: User;
  triggerNotification: (text: string, type: 'success' | 'error' | 'info') => void;
}

export function AdminAccountsPanel({ currentUser, triggerNotification }: AdminAccountsPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create account form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTeam, setNewTeam] = useState<'Personality' | 'Cognitive' | 'Both'>('Personality');
  const [newRole, setNewRole] = useState<'Admin' | 'Team Member'>('Team Member');

  // Password edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPasswordValue, setEditPasswordValue] = useState('');

  // Load users from localStorage
  const loadUsers = () => {
    const saved = localStorage.getItem('corporate_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.some((u: any) => u.id === 'admin')) {
          setUsers(SEEDED_USERS);
          localStorage.setItem('corporate_users', JSON.stringify(SEEDED_USERS));
        } else {
          setUsers(parsed);
        }
      } catch (e) {
        setUsers(SEEDED_USERS);
      }
    } else {
      setUsers(SEEDED_USERS);
      localStorage.setItem('corporate_users', JSON.stringify(SEEDED_USERS));
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const saveUsersToStorage = (updatedUsers: any[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('corporate_users', JSON.stringify(updatedUsers));
    
    // Persist all changes (add, delete, update password) to backend code
    fetch('/api/sync-users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_API_TOKEN || ''}`
      },
      body: JSON.stringify({ users: updatedUsers })
    }).catch(err => console.error('Failed to sync users to code:', err));
  };

  // Helper to determine printable Employee ID
  const getEmpIdOfUser = (user: any) => {
    if (user.id === 'admin') return 'admin';
    return user.empId || user.id || 'EMP-MEMBER';
  };

  // Add new account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmpId.trim() || !newPassword.trim()) {
      triggerNotification('Please complete all required fields', 'error');
      return;
    }

    const empIdUpper = newEmpId.trim().toUpperCase();
    
    // Check duplication
    const exists = users.some(u => {
      const uEmpId = getEmpIdOfUser(u).toUpperCase();
      const uEmail = (u.email || '').toUpperCase();
      const searchTarget = empIdUpper;
      return uEmpId === searchTarget || uEmail === searchTarget || uEmail.split('@')[0] === searchTarget;
    });

    if (exists) {
      triggerNotification('An account with this ID or Email already exists', 'error');
      return;
    }

    const hashedPassword = await hashPassword(newPassword);

    const newUserObj = {
      id: `user-${Date.now()}`,
      email: empIdUpper.includes('@') ? empIdUpper.toLowerCase() : `${empIdUpper.toLowerCase()}@example.com`,
      empId: empIdUpper,
      password: hashedPassword,
      fullName: newFullName.trim(),
      role: newRole,
      team: newTeam
    };

    const updated = [...users, newUserObj];
    saveUsersToStorage(updated);
    
    // Reset form
    setNewFullName('');
    setNewEmpId('');
    setNewPassword('');
    setShowAddForm(false);
    
    triggerNotification(`Successfully registered ${newFullName.trim()}!`, 'success');
  };

  // Delete account
  const handleDeleteAccount = (userId: string, userName: string) => {
    if (userId === 'admin' || userId === currentUser.id) {
      triggerNotification('Cannot delete primary or currently active session Administrator account.', 'error');
      return;
    }

    if (window.confirm(`Are you absolutely sure you want to revoke system privileges and permanently delete the account for ${userName}?`)) {
      const updated = users.filter(u => u.id !== userId);
      saveUsersToStorage(updated);
      triggerNotification(`Revoked access for ${userName}`, 'success');
    }
  };

  // Reset password
  const startEditingPassword = (user: any) => {
    setEditingUserId(user.id);
    setEditPasswordValue('');
  };

  const handleSavePassword = async (userId: string, userName: string) => {
    if (!editPasswordValue.trim()) {
      triggerNotification('Password cannot be left blank', 'error');
      return;
    }

    const hashedPassword = await hashPassword(editPasswordValue.trim());

    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, password: hashedPassword };
      }
      return u;
    });

    saveUsersToStorage(updated);
    setEditingUserId(null);
    triggerNotification(`Password updated for ${userName}`, 'success');
  };

  // Filter users based on query
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const fullNameLower = (u.fullName || '').toLowerCase();
    const emailLower = (u.email || '').toLowerCase();
    const empIdLower = getEmpIdOfUser(u).toLowerCase();
    const teamLower = (u.team || '').toLowerCase();
    const roleLower = (u.role || '').toLowerCase();

    return fullNameLower.includes(q) || 
           emailLower.includes(q) || 
           empIdLower.includes(q) ||
           teamLower.includes(q) ||
           roleLower.includes(q);
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="admin-accounts-panel">
      
      {/* Banner / Header */}
      <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden" id="accounts-header">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
              <Shield size={24} className="text-mettl-green animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-mettl-green block mb-0.5">
                Admin Security System
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
                Credential & Account Directory
              </h2>
              <p className="text-white/70 text-xs mt-1.5 max-w-xl">
                Real-time registry of authorized psychometric and cognitive portal users. Manage access permissions and perform secure password resets.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-mettl-blue text-xs font-black rounded-2xl transition-all shadow-md flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            id="toggle-add-user-btn"
          >
            {showAddForm ? (
              <>
                <X size={14} className="stroke-[2.5]" />
                Cancel Form
              </>
            ) : (
              <>
                <Plus size={14} className="stroke-[2.5]" />
                Register New Account
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6" id="accounts-body">
        
        {/* ADD USER COLLAPSIBLE BOX */}
        {showAddForm && (
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-scale-in" id="add-user-form-container">
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <span className="p-1 bg-mettl-blue-light text-mettl-blue rounded-lg">
                <UserIcon size={14} />
              </span>
              Register New Portal Account
            </h4>
            
            <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4" id="add-account-form">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Green"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-mettl-blue text-slate-800"
                />
              </div>

              {/* Emp ID / Email */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee ID / Email</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-PSY-05"
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-mettl-blue text-slate-800"
                />
              </div>

              {/* Initial Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Access Password</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. password123"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-mettl-blue text-slate-800 font-mono"
                />
              </div>

              {/* Workspace Selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Team Workspace</label>
                <select
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value as 'Personality' | 'Cognitive' | 'Both')}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-mettl-blue text-slate-800 cursor-pointer"
                >
                  <option value="Personality">Personality Team</option>
                  <option value="Cognitive">Cognitive Team</option>
                  <option value="Both">Both Teams (Cross-Functional)</option>
                </select>
              </div>

              {/* Submit action */}
              <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-mettl-blue text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SEARCH AND FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-150" id="accounts-toolbar">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search by name, ID, team, role, or credentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-mettl-blue text-slate-800 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="text-slate-400 text-[11px] font-medium font-mono text-right shrink-0">
            Showing <strong className="text-slate-700">{filteredUsers.length}</strong> of <strong className="text-slate-700">{users.length}</strong> registered logins
          </div>
        </div>

        {/* ACCOUNTS DATA TABLE */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs" id="accounts-table-container">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-6 py-3.5 font-bold text-slate-500 tracking-wider uppercase text-[10px]">User Full Name</th>
                  <th scope="col" className="px-6 py-3.5 font-bold text-slate-500 tracking-wider uppercase text-[10px]">Employee ID / Email</th>
                  <th scope="col" className="px-6 py-3.5 font-bold text-slate-500 tracking-wider uppercase text-[10px]">Team Group</th>
                  <th scope="col" className="px-6 py-3.5 font-bold text-slate-500 tracking-wider uppercase text-[10px]">Privilege Role</th>
                  <th scope="col" className="px-6 py-3.5 font-bold text-slate-500 tracking-wider uppercase text-[10px] text-amber-700 bg-amber-50/40">Credential Management</th>
                  <th scope="col" className="px-6 py-3.5 font-bold text-slate-500 tracking-wider uppercase text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No team members found matching your search term.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isEditing = editingUserId === user.id;
                    const empId = getEmpIdOfUser(user);
                    const isSelf = user.id === currentUser.id;

                    return (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${isSelf ? 'bg-mettl-blue-light/15' : ''}`}
                      >
                        {/* Name */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {user.fullName}
                            {isSelf && (
                              <span className="text-[9px] font-extrabold bg-mettl-blue-light text-mettl-blue px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ID / Email */}
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                          <div className="font-semibold text-slate-700">{empId}</div>
                          <div className="text-[10px] text-slate-400">{user.email || `${empId.toLowerCase()}@example.com`}</div>
                        </td>

                        {/* Team */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            user.team === 'Cognitive' 
                              ? 'bg-sky-50 text-sky-700 border border-sky-100' 
                              : 'bg-mettl-green-light text-emerald-700 border border-emerald-100'
                          }`}>
                            <Layers size={10} />
                            {user.team} Team
                          </span>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            user.role === 'Admin' 
                              ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                              : 'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}>
                            <Shield size={10} />
                            {user.role}
                          </span>
                        </td>

                        {/* Plaintext Password column (Required) */}
                        <td className="px-6 py-4 bg-amber-50/10 font-mono text-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Enter new password"
                                value={editPasswordValue}
                                onChange={(e) => setEditPasswordValue(e.target.value)}
                                className="px-2.5 py-1 text-xs border border-amber-300 rounded-lg outline-hidden bg-white text-slate-800 font-mono focus:border-mettl-blue focus:ring-1 focus:ring-mettl-blue/10"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg select-none">
                                ••••••••
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Cancel Password Edit"
                                >
                                  <X size={14} />
                                </button>
                                <button
                                  onClick={() => handleSavePassword(user.id, user.fullName)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-mettl-green-light rounded-lg transition-colors cursor-pointer border border-emerald-200"
                                  title="Confirm Password Update"
                                >
                                  <Check size={14} className="stroke-[2.5]" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingPassword(user)}
                                  className="px-2 py-1 text-[11px] font-bold text-mettl-blue hover:bg-mettl-blue-light rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-slate-150"
                                  title="Reset password key"
                                >
                                  <RefreshCw size={11} />
                                  Reset Pass
                                </button>
                                
                                {user.id !== 'user-admin-1' && user.id !== currentUser.id && (
                                  <button
                                    onClick={() => handleDeleteAccount(user.id, user.fullName)}
                                    className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Revoke access rights"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security guidelines note */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start gap-2 text-slate-500 text-xs leading-relaxed" id="security-disclaimer">
          <Shield size={14} className="text-mettl-blue shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-700 block mb-0.5">Administrative Security Standard Protocol:</strong>
            As a supervisor, you can reset employee login keys securely. Passwords are encrypted and cannot be viewed in plaintext. Password resets are applied instantly. Deleted accounts cannot be restored, and employees will immediately lose database access rights.
          </div>
        </div>

      </div>
    </div>
  );
}
