import React, { useState, useEffect, useMemo } from 'react';
import { User, Ticket } from '../types';
import { Activity, Users, Calendar, Clock, BarChart3, Briefcase, User as UserIcon } from 'lucide-react';

interface AdminBandwidthPanelProps {
  tickets: Ticket[];
}

export function AdminBandwidthPanel({ tickets }: AdminBandwidthPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<'Personality' | 'Cognitive'>('Personality');
  const [timeRange, setTimeRange] = useState<'Day' | 'Week' | 'Month'>('Day');

  useEffect(() => {
    const saved = localStorage.getItem('corporate_users');
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse users");
      }
    }
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const isInCurrentWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    
    // Set to midnight
    d.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    
    const day = now.getDay() || 7; // Get current day number, converting Sun(0) to 7
    if (day !== 1) now.setHours(-24 * (day - 1)); // Set to Monday
    
    const startOfWeek = new Date(now);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to Sunday

    return d >= startOfWeek && d <= endOfWeek;
  };

  const isInCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  // Filter users by selected team
  const teamUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Admin' && (u.team === selectedTeam || u.team === 'Both'));
  }, [users, selectedTeam]);

  // Calculate bandwidth per user
  const workloadData = useMemo(() => {
    return teamUsers.map(user => {
      // Filter tickets by time range
      const rangeTickets = tickets.filter(t => {
        if (timeRange === 'Day') return t.dueDate === todayStr;
        if (timeRange === 'Week') return isInCurrentWeek(t.dueDate);
        if (timeRange === 'Month') return isInCurrentMonth(t.dueDate);
        return false;
      });

      // Deliveries: assigned to user & not delivered
      const openDeliveries = rangeTickets.filter(t => 
        t.assignedTo === user.fullName && 
        t.status !== 'Delivered'
      ).length;

      // Reviews: user is reviewer & status is Review Pending
      const openReviews = rangeTickets.filter(t => 
        t.reviewerName === user.fullName && 
        t.status === 'Review Pending'
      ).length;

      const totalLoad = openDeliveries + openReviews;

      return {
        ...user,
        openDeliveries,
        openReviews,
        totalLoad
      };
    }).sort((a, b) => b.totalLoad - a.totalLoad); // Sort highest load first
  }, [teamUsers, tickets, timeRange, todayStr]);

  const maxLoad = Math.max(...workloadData.map(d => d.totalLoad), 10); // Minimum scale of 10 for the progress bar

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full animate-fade-in" id="bandwidth-dashboard-card">
      
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-mettl-blue text-white rounded-xl shadow-sm">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Team Bandwidth</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live workload analysis of open deliveries and pending reviews.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Team Switcher */}
          <div className="flex p-1 bg-slate-200/60 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setSelectedTeam('Personality')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                selectedTeam === 'Personality'
                  ? 'bg-white text-mettl-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={14} />
              Personality
            </button>
            <button
              onClick={() => setSelectedTeam('Cognitive')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                selectedTeam === 'Cognitive'
                  ? 'bg-white text-mettl-blue shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={14} />
              Cognitive
            </button>
          </div>

          {/* Time Range Toggle */}
          <div className="flex p-1 bg-slate-200/60 rounded-xl border border-slate-200 w-full sm:w-auto">
            {['Day', 'Week', 'Month'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  timeRange === range
                    ? 'bg-white text-mettl-blue shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {range === 'Day' && <Clock size={12} />}
                {range === 'Week' && <Calendar size={12} />}
                {range === 'Month' && <BarChart3 size={12} />}
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Workload Cards */}
      <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
        {workloadData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">
            No team members found for this team.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {workloadData.map(user => {
              // Calculate width for visual indicator bar
              const deliveryWidth = Math.min((user.openDeliveries / maxLoad) * 100, 100);
              const reviewWidth = Math.min((user.openReviews / maxLoad) * 100, 100);

              return (
                <div key={user.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow group relative">
                  
                  {/* Total Load Badge */}
                  <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-mono font-bold text-slate-700 shadow-sm text-sm" title="Total Active Load">
                    {user.totalLoad}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-mettl-blue-light/50 flex items-center justify-center text-mettl-blue border border-blue-100">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 line-clamp-1 pr-8">{user.fullName}</h3>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{user.role}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Deliveries Metric */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <Briefcase size={12} className="text-mettl-blue" />
                        Open Deliveries
                      </div>
                      <span className="text-sm font-bold text-mettl-blue font-mono bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {user.openDeliveries}
                      </span>
                    </div>

                    {/* Reviews Metric */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <Activity size={12} className="text-purple-600" />
                        Pending Reviews
                      </div>
                      <span className="text-sm font-bold text-purple-700 font-mono bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                        {user.openReviews}
                      </span>
                    </div>
                  </div>

                  {/* Visual Load Indicator Bar */}
                  <div className="mt-5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Capacity Load</span>
                      <span className={`text-[10px] font-bold uppercase ${
                        user.totalLoad === 0 ? 'text-slate-400' :
                        user.totalLoad > 8 ? 'text-rose-600' : 
                        user.totalLoad > 4 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {user.totalLoad === 0 ? 'Idle' :
                         user.totalLoad > 8 ? 'Heavy' : 
                         user.totalLoad > 4 ? 'Moderate' : 'Light'}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      {user.openDeliveries > 0 && (
                        <div 
                          style={{ width: `${deliveryWidth}%` }} 
                          className="h-full bg-mettl-blue transition-all duration-500" 
                          title={`Deliveries: ${user.openDeliveries}`}
                        />
                      )}
                      {user.openReviews > 0 && (
                        <div 
                          style={{ width: `${reviewWidth}%` }} 
                          className="h-full bg-purple-500 transition-all duration-500" 
                          title={`Reviews: ${user.openReviews}`}
                        />
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
