/// <reference types="vite/client" />
import React, { useState, useMemo, useEffect } from 'react';
import { User } from '../types';
import { SEEDED_USERS } from '../initialData';
import { Shield, Lock, User as UserIcon, HelpCircle, LogIn, UserPlus, ArrowRight, Layers, Key, Eye, EyeOff } from 'lucide-react';
import { hashPassword } from '../utils/hash';

interface LoginSignupProps {
  onLoginSuccess: (user: User) => void;
}

export function LoginSignup({ onLoginSuccess }: LoginSignupProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [team, setTeam] = useState<'Personality' | 'Cognitive'>('Personality');
  const [masterPasscode, setMasterPasscode] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingMultiTeamUser, setPendingMultiTeamUser] = useState<User | null>(null);

  // Pre-fetch/initialize users in localStorage if they don't exist
  const getStoredUsers = () => {
    const saved = localStorage.getItem('corporate_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If it's the old list (lacks 'admin' user), let's reset to the new single admin seed!
        if (!parsed.some((u: any) => u.id === 'admin')) {
          localStorage.setItem('corporate_users', JSON.stringify(SEEDED_USERS));
          return SEEDED_USERS;
        }
        return parsed;
      } catch (e) {
        localStorage.setItem('corporate_users', JSON.stringify(SEEDED_USERS));
        return SEEDED_USERS;
      }
    }
    // Set seed on first load
    localStorage.setItem('corporate_users', JSON.stringify(SEEDED_USERS));
    return SEEDED_USERS;
  };

  const getEmpIdOfUser = (user: any) => {
    if (user.id === 'admin') return 'admin';
    return user.empId || user.id || 'EMP-MEMBER';
  };

  // Real-time lookup of the user's details and team alignment
  const matchedUser = useMemo(() => {
    if (!employeeId.trim()) return null;
    const currentUsers = getStoredUsers();
    return currentUsers.find((u: any) => {
      const inputLower = employeeId.trim().toLowerCase();
      const userEmailLower = (u.email || '').trim().toLowerCase();
      const userIdLower = (u.id || '').trim().toLowerCase();
      const userFullNameLower = (u.fullName || '').trim().toLowerCase();
      const userEmpIdLower = getEmpIdOfUser(u).toLowerCase();

      return (
        inputLower === userEmailLower ||
        inputLower === userIdLower ||
        inputLower === userFullNameLower ||
        inputLower === userEmpIdLower
      );
    });
  }, [employeeId]);

  // Real-time auto-fetch of team
  useEffect(() => {
    if (isLogin && matchedUser) {
      if (matchedUser.team === 'Personality' || matchedUser.team === 'Cognitive') {
        setTeam(matchedUser.team);
      }
    }
  }, [matchedUser, isLogin]);

  const handlePreload = (empId: string, teamName: 'Personality' | 'Cognitive', pass: string) => {
    setEmployeeId(empId);
    setPassword(pass);
    setTeam(teamName);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!employeeId.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const currentUsers = getStoredUsers();
    const hashedPassword = await hashPassword(password);
    const adminEnvSecret = import.meta.env.VITE_ADMIN_BYPASS;
    const adminBypassHash = adminEnvSecret ? await hashPassword(adminEnvSecret) : null;

    if (isLogin) {
      // ---------------- LOGIN FLOW ----------------
      const user = currentUsers.find((u: any) => {
        const inputLower = employeeId.trim().toLowerCase();
        const userEmailLower = (u.email || '').trim().toLowerCase();
        const userIdLower = (u.id || '').trim().toLowerCase();
        const userFullNameLower = (u.fullName || '').trim().toLowerCase();
        const userEmpIdLower = getEmpIdOfUser(u).toLowerCase();

        // Match user by Email, User ID, Full Name or Employee ID
        const isIdentifierMatch =
          inputLower === userEmailLower ||
          inputLower === userIdLower ||
          inputLower === userFullNameLower ||
          inputLower === userEmpIdLower;

        if (!isIdentifierMatch) return false;

        // Match password: must match the account's own password, or Admin master passcode (Admin role only)
        // Check both hashed and plaintext for backward compatibility during transition
        const isPasswordMatch =
          password === u.password ||
          hashedPassword === u.password ||
          (u.role === 'Admin' && adminEnvSecret && (password === adminEnvSecret || hashedPassword === adminBypassHash));

        return isPasswordMatch;
      });

      if (user) {
        if (user.team === 'Both') {
          setPendingMultiTeamUser(user);
        } else {
          onLoginSuccess({
            id: user.id,
            email: user.email || 'ayushguptaexcel@gmail.com',
            fullName: user.fullName,
            role: user.role,
            team: user.team
          });
        }
      } else {
        setError('Invalid Employee ID, Email, or Password. Please try again.');
      }
    } else {
      // ---------------- SIGNUP FLOW ----------------
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }

      const masterEnvPasscode = import.meta.env.VITE_MASTER_PASSCODE;
      if (!masterEnvPasscode || masterPasscode !== masterEnvPasscode) {
        setError('Incorrect or missing Master Registration Passcode. Only authorized personnel can create team accounts.');
        return;
      }

      // Check if user already exists
      const idExists = currentUsers.some((u: any) => {
        const inputLower = employeeId.trim().toLowerCase();
        const userEmailLower = (u.email || '').trim().toLowerCase();
        const userEmpIdLower = getEmpIdOfUser(u).toLowerCase();
        return inputLower === userEmailLower || inputLower === userEmpIdLower;
      });

      if (idExists) {
        setError('An account with this Employee ID already exists.');
        return;
      }

      // Create a standard Team Member account (Admin is never self-assignable)
      const newUser = {
        id: `user-${Date.now()}`,
        email: employeeId.trim().toLowerCase().includes('@') ? employeeId.trim().toLowerCase() : `${employeeId.trim().toLowerCase()}@company.com`,
        empId: employeeId.trim().toUpperCase(),
        password: hashedPassword,
        fullName: fullName.trim(),
        role: 'Team Member' as const,
        team: team
      };

      const updatedUsers = [...currentUsers, newUser];
      localStorage.setItem('corporate_users', JSON.stringify(updatedUsers));

      // Persist to backend users.json so it gets baked into the code
      fetch('/api/save-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_API_TOKEN || ''}`
        },
        body: JSON.stringify(newUser)
      }).catch(err => console.error('Failed to sync new user to code:', err));

      // Switch to login tab on successful signup
      setIsLogin(true);
      setSuccessMessage('Account created successfully! Please log in.');
      setPassword('');
      setMasterPasscode('');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4" id="auth-page-wrapper">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col" id="auth-card">

        {/* Navigation/Brand Bar - Mettl Brand Gradient */}
        <div className="bg-mettl-gradient text-white p-10 relative overflow-hidden flex flex-col justify-center" id="auth-header">
          {/* Accent decoration */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-mettl-blue-light0/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-mettl-blue-light0/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm">
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <span className="text-lg uppercase tracking-widest font-mono font-extrabold text-white block mb-1">
                Psychometric Deliverable Tracker
              </span>
              <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-10 flex-1 flex flex-col justify-center" id="auth-body">
          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-medium rounded-2xl flex items-start gap-2.5 mb-5" id="auth-error">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-medium rounded-2xl flex items-start gap-2.5 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {pendingMultiTeamUser ? (
            <div className="space-y-4 animate-fade-in text-center pb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Select Your Session Context</h3>
                <p className="text-xs text-slate-500">You belong to multiple teams. Please select which team you are logging into for this session.</p>
              </div>

              <button
                onClick={() => onLoginSuccess({ ...pendingMultiTeamUser, loginTeam: 'Personality' })}
                className="w-full bg-mettl-blue text-white py-3.5 px-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Login as Personality Team
              </button>

              <button
                onClick={() => onLoginSuccess({ ...pendingMultiTeamUser, loginTeam: 'Cognitive' })}
                className="w-full bg-slate-800 text-white py-3.5 px-4 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Login as Cognitive Team
              </button>

              <button
                onClick={() => setPendingMultiTeamUser(null)}
                className="w-full mt-4 py-2 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel and go back
              </button>
            </div>
          ) : (
            <>
              {/* Form Tabs */}
              <div className="flex border-b border-slate-100 pb-px mb-6" id="auth-tabs">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 ${isLogin
                    ? 'border-mettl-blue text-mettl-blue'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  id="tab-sign-in"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 ${!isLogin
                    ? 'border-mettl-blue text-mettl-blue'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  id="tab-sign-up"
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">

                {/* Full Name for Signup */}
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="fullName">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400">
                        <UserIcon size={16} />
                      </div>
                      <input
                        id="fullName"
                        type="text"
                        required
                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-2xl outline-hidden transition-all text-slate-800"
                        placeholder=""
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Employee ID / Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="employeeId">
                    Employee ID
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400">
                      <UserIcon size={16} />
                    </div>
                    <input
                      id="employeeId"
                      type="text"
                      required
                      className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-2xl outline-hidden transition-all text-slate-800"
                      placeholder="Enter your Employee ID"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="password">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-2xl outline-hidden transition-all text-slate-800"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Team Dropdown / Display */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="team">
                    Workspace Team
                  </label>

                  {isLogin && matchedUser ? (
                    matchedUser.team === 'Both' || matchedUser.role === 'Admin' ? (
                      <div className="p-2.5 bg-mettl-green-light border border-emerald-150 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-mettl-green animate-pulse shrink-0" />
                        <div>
                          <span className="font-bold">Welcome, {matchedUser.fullName}!</span> You will choose a workspace after login.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-blue-50 border border-blue-150 rounded-xl text-blue-800 text-xs flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-100 rounded-lg text-mettl-blue shrink-0">
                          <Layers size={14} />
                        </div>
                        <div>
                          <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-600">Welcome Back {matchedUser.fullName}!!</span>
                          <span className="font-extrabold text-[13px]">{matchedUser.team} Workspace</span>
                        </div>
                      </div>
                    )
                  ) : !isLogin ? (
                    <div className="space-y-2">
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400">
                          <Layers size={16} />
                        </div>
                        <select
                          id="team"
                          required
                          value={team}
                          onChange={(e) => setTeam(e.target.value as 'Personality' | 'Cognitive')}
                          className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-2xl outline-hidden transition-all text-slate-800 cursor-pointer"
                        >
                          <option value="Personality">Personality Team</option>
                          <option value="Cognitive">Cognitive Team</option>
                        </select>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-2">
                        * Note: Signup accounts are restricted strictly to Team Member privileges.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs flex items-center gap-2.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold">Waiting for valid ID...</span>
                    </div>
                  )}
                </div>

                {/* Master Registration Passcode (Only for SignUp) */}
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="masterPasscode">
                      Master Registration Passcode
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-slate-400">
                        <Key size={16} />
                      </div>
                      <input
                        id="masterPasscode"
                        type="password"
                        required
                        className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-2xl outline-hidden transition-all text-slate-800"
                        placeholder=""
                        value={masterPasscode}
                        onChange={(e) => setMasterPasscode(e.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1.5 font-mono font-medium pl-1">
                      * Secure verification: Registration is locked to administrators.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-mettl-gradient hover:opacity-90 hover:-translate-y-0.5 text-white font-semibold py-3 px-4 rounded-full shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer mt-4"
                  id="btn-auth-action"
                >
                  {isLogin ? (
                    <>
                      Log In to Workspace
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="text-white" />
                      Create Account
                    </>
                  )}
                  <ArrowRight size={14} />
                </button>
              </form>
            </>
          )}

          {/* Contact / Help link */}
          <div className="mt-8 text-center" id="auth-footer">
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Designed and developed by Psychometric Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
