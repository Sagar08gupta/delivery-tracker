import React, { useState, useMemo } from 'react';
import { Ticket } from '../types';
import { CheckCircle, Clock, AlertTriangle, ListTodo, Award, Calendar } from 'lucide-react';

interface StatsOverviewProps {
  tickets: Ticket[];
}

export function StatsOverview({ tickets }: StatsOverviewProps) {
  const [timeFilter, setTimeFilter] = useState<'Day' | 'Week' | 'Month' | 'All'>('All');

  const filteredTickets = useMemo(() => {
    if (timeFilter === 'All') return tickets;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    return tickets.filter(t => {
      if (!t.dueDate) return false;
      const tDate = new Date(t.dueDate);
      
      if (timeFilter === 'Day') {
        return t.dueDate === todayStr;
      } else if (timeFilter === 'Week') {
        // Simple week logic: within 7 days (or same ISO week, but let's do rolling 7 days for simplicity, or same calendar week)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const startOfWeek = new Date(new Date(now).setDate(diff));
        startOfWeek.setHours(0,0,0,0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23,59,59,999);
        return tDate >= startOfWeek && tDate <= endOfWeek;
      } else if (timeFilter === 'Month') {
        const tMonth = tDate.getMonth();
        const tYear = tDate.getFullYear();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return tMonth === currentMonth && tYear === currentYear;
      }
      return true;
    });
  }, [tickets, timeFilter]);

  const total = filteredTickets.length;
  const completed = filteredTickets.filter(t => t.status === 'Delivered').length;
  const pending = filteredTickets.filter(t => t.status !== 'Delivered').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const overdue = filteredTickets.filter(t => 
    t.status !== 'Delivered' && t.dueDate < todayStr
  ).length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Time Filter Switch */}
      <div className="flex justify-end">
        <div className="bg-slate-100 p-1 rounded-2xl inline-flex text-xs font-semibold">
          {(['Day', 'Week', 'Month', 'All'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                timeFilter === f 
                  ? 'bg-white text-mettl-blue shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar size={12} />
              {f === 'All' ? 'All Time' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-overview-container">
        {/* Total Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:shadow-md" id="stat-card-total">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Tracked</span>
            <span className="text-3xl font-extrabold text-mettl-blue tracking-tight mt-1 block">{total}</span>
          </div>
          <div className="p-3 bg-mettl-blue-light text-mettl-blue rounded-xl">
            <ListTodo size={22} id="icon-total" />
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:shadow-md" id="stat-card-completed">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Delivered</span>
            <span className="text-3xl font-extrabold text-mettl-green tracking-tight mt-1 block">{completed}</span>
          </div>
          <div className="p-3 bg-mettl-green-light text-mettl-green rounded-xl">
            <CheckCircle size={22} id="icon-completed" />
          </div>
        </div>

        {/* Yet to Deliver Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:shadow-md" id="stat-card-pending">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">In Pipeline</span>
            <span className="text-3xl font-extrabold text-amber-600 tracking-tight mt-1 block">{pending}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={22} id="icon-pending" />
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:shadow-md" id="stat-card-overdue">
          <div>
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider block">Overdue</span>
            <span className={`text-3xl font-extrabold tracking-tight mt-1 block ${overdue > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
              {overdue}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${overdue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle size={22} id="icon-overdue" />
          </div>
        </div>

        {/* Completion Rate Ring Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between transition-all hover:shadow-md col-span-1 md:col-span-2 lg:col-span-1" id="stat-card-rate">
          <div className="flex-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Delivery Rate</span>
            <span className="text-3xl font-extrabold text-mettl-blue tracking-tight mt-1 block">{completionRate}%</span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-mettl-green h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
                id="delivery-rate-bar"
              />
            </div>
          </div>
          <div className="ml-4 flex items-center justify-center relative w-12 h-12">
            {/* Radial ring background */}
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
              <circle 
                cx="24" 
                cy="24" 
                r="20" 
                stroke="var(--color-mettl-green)" 
                strokeWidth="4" 
                fill="transparent" 
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (125.6 * completionRate) / 100}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <Award className="absolute text-mettl-blue" size={16} id="icon-rate" />
          </div>
        </div>
      </div>
    </div>
  );
}
