import React, { useState, useMemo } from 'react';
import { Ticket } from '../types';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { BarChart3, AlertOctagon, HelpCircle, Users, Activity, Globe, CheckCircle } from 'lucide-react';

interface AnalyticsDashboardProps {
  tickets: Ticket[];
}

export function AnalyticsDashboard({ tickets }: AnalyticsDashboardProps) {
  const [selectedTeamTab, setSelectedTeamTab] = useState<'All' | 'Personality' | 'Cognitive'>('All');
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Filtered tickets based on selected team tab
  const filteredTickets = useMemo(() => {
    if (selectedTeamTab === 'All') return tickets;
    return tickets.filter(t => t.team === selectedTeamTab);
  }, [tickets, selectedTeamTab]);

  // 2. High-level metric counts
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const completed = filteredTickets.filter(t => t.status === 'Delivered').length;
    const pending = filteredTickets.filter(t => t.status !== 'Delivered').length;
    const overdue = filteredTickets.filter(t => t.dueDate < todayStr && t.status !== 'Delivered').length;

    return { total, completed, pending, overdue };
  }, [filteredTickets, todayStr]);

  // 3. Status Breakdown for Pie Chart
  // Primary colors: Mettl Purple (#8246af) for Delivered, Mettl Blue (#009de0) for Pending
  const statusChartData = useMemo(() => {
    const completeCount = filteredTickets.filter(t => t.status === 'Delivered').length;
    const pendingCount = filteredTickets.filter(t => t.status !== 'Delivered').length;

    return [
      { name: 'Delivered', value: completeCount, color: '#8246af' },
      { name: 'Pending', value: pendingCount, color: '#009de0' }
    ].filter(item => item.value > 0);
  }, [filteredTickets]);

  // 4. Team Workload Breakdown (Section 8: ticket count per Assigned-To person, grouped by team)
  const workloadData = useMemo(() => {
    const workloadMap: { [key: string]: { name: string; team: string; completed: number; pending: number; total: number } } = {};

    filteredTickets.forEach(t => {
      const key = `${t.team}-${t.assignedTo}`;
      if (!workloadMap[key]) {
        workloadMap[key] = {
          name: t.assignedTo,
          team: t.team,
          completed: 0,
          pending: 0,
          total: 0
        };
      }
      workloadMap[key].total += 1;
      if (t.status === 'Delivered') {
        workloadMap[key].completed += 1;
      } else {
        workloadMap[key].pending += 1;
      }
    });

    return Object.values(workloadMap).sort((a, b) => b.total - a.total);
  }, [filteredTickets]);

  // 5. Region Breakdown
  const regionChartData = useMemo(() => {
    const regionMap: { [key: string]: { name: string; value: number } } = {};
    
    filteredTickets.forEach(t => {
      const r = t.region || 'India';
      if (!regionMap[r]) {
        regionMap[r] = { name: r, value: 0 };
      }
      regionMap[r].value += 1;
    });

    return Object.values(regionMap).sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  // 6. Overdue tickets list (Due Date passed, Status !== Complete)
  const overdueList = useMemo(() => {
    return filteredTickets.filter(t => t.dueDate < todayStr && t.status !== 'Delivered');
  }, [filteredTickets, todayStr]);

  const isEmpty = tickets.length === 0;

  if (isEmpty) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center" id="analytics-empty-panel">
        <div className="max-w-md mx-auto py-16 flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-slate-50 text-mettl-blue rounded-full">
            <BarChart3 className="stroke-[1.2]" size={48} />
          </div>
          <h4 className="font-bold text-mettl-blue text-lg">No Tickets Logs Found</h4>
          <p className="text-xs text-slate-500">
            Please register or import deliverables to populate the quality assurance charts, agent workload gauges, and overdue compliance dashboards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="analytics-grid-container">
      
      {/* Tab Selectors for Team Drilldown */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs max-w-md" id="team-selector-tabs">
        {(['All', 'Personality', 'Cognitive'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTeamTab(tab)}
            className={`flex-1 py-2 px-4 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              selectedTeamTab === tab
                ? 'bg-mettl-blue text-white shadow-sm'
                : 'text-slate-500 hover:text-mettl-blue hover:bg-slate-50'
            }`}
          >
            {tab === 'All' ? 'Combined View' : `${tab} Team`}
          </button>
        ))}
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-row">
        
        {/* Total Tickets */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Tickets</span>
            <span className="text-2xl font-extrabold text-mettl-blue">{stats.total}</span>
          </div>
          <div className="p-3 bg-mettl-blue-light text-mettl-blue rounded-xl">
            <Activity size={20} />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Delivered Tasks</span>
            <span className="text-2xl font-extrabold text-mettl-green">{stats.completed}</span>
          </div>
          <div className="p-3 bg-mettl-green-light text-mettl-green rounded-xl">
            <CheckCircle size={20} />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Deliveries</span>
            <span className="text-2xl font-extrabold text-mettl-blue/80">{stats.pending}</span>
          </div>
          <div className="p-3 bg-mettl-blue-light text-mettl-blue rounded-xl">
            <HelpCircle size={20} />
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Overdue Tickets</span>
            <span className={`text-2xl font-extrabold ${stats.overdue > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>{stats.overdue}</span>
          </div>
          <div className={`p-3 rounded-xl ${stats.overdue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertOctagon size={20} />
          </div>
        </div>

      </div>

      {/* Overdue compliance details warning banner */}
      {overdueList.length > 0 && (
        <div className="bg-rose-50 border border-rose-150 p-5 rounded-2xl space-y-3" id="overdue-alarm-banner">
          <div className="flex items-center gap-2">
            <AlertOctagon className="text-rose-600 animate-bounce" size={20} />
            <h4 className="text-sm font-bold text-rose-900">
              Urgent Follow-Up Required: {overdueList.length} Overdue Team Deliverables Detected!
            </h4>
          </div>
          <div className="max-h-40 overflow-y-auto bg-white rounded-xl border border-rose-100 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-600 text-white font-semibold">
                <tr>
                  <th className="p-2">Ticket ID</th>
                  <th className="p-2">Client</th>
                  <th className="p-2">Type of Deliverable</th>
                  <th className="p-2">Assigned Agent</th>
                  <th className="p-2 text-center">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50 text-rose-800">
                {overdueList.map(t => (
                  <tr key={t.id} className="hover:bg-rose-50/50">
                    <td className="p-2 font-mono font-bold">{t.ticketId}</td>
                    <td className="p-2 font-medium">{t.clientName}</td>
                    <td className="p-2">{t.deliverableType}</td>
                    <td className="p-2">
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                        {t.assignedTo} ({t.team})
                      </span>
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-rose-700">{t.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="analytics-charts">
        
        {/* Status Ratio Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl flex flex-col" id="status-chart-panel">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <span className="p-1.5 bg-mettl-blue-light text-mettl-blue rounded-xl">
              <Activity size={16} />
            </span>
            <h4 className="font-bold text-mettl-blue text-sm">Quality Metrics: Delivery Ratio</h4>
          </div>

          <div className="h-64 flex items-center justify-center relative">
            {statusChartData.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No tickets in this selection to plot</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#009de0', borderRadius: '12px', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 text-xs text-slate-400 bg-slate-50 p-3.5 rounded-xl flex items-start gap-2 border border-slate-150">
            <span className="w-2 h-2 rounded-full bg-mettl-blue mt-1 shrink-0" />
            <span>
              <strong>Purple (#8246af)</strong> denotes complete delivery. <strong>Blue (#009de0)</strong> signifies outstanding team deliverables.
            </span>
          </div>
        </div>

        {/* Region breakdown Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl flex flex-col" id="region-chart-panel">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <span className="p-1.5 bg-mettl-blue-light text-mettl-blue rounded-xl">
              <Globe size={16} />
            </span>
            <h4 className="font-bold text-mettl-blue text-sm">Global Regional Breakdown</h4>
          </div>

          <div className="h-64 flex items-center justify-center">
            {regionChartData.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No regional metrics to plot</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={regionChartData}
                  margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 650 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ background: '#009de0', borderRadius: '12px', border: 'none', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#009de0" barSize={32} radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 10, fill: '#009de0', fontWeight: 'bold' }}>
                    {regionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#009de0' : '#8246af'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 text-xs text-slate-400 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
            Helps compliance teams trace load distribution across client geographies. Manage regions instantly via the table toolbar manager.
          </div>
        </div>

      </div>

      {/* Workload breakdown List & Progress Bars (grouped by Team as requested in Section 8) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6" id="workload-breakdown">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
          <span className="p-1.5 bg-mettl-blue-light text-mettl-blue rounded-xl">
            <Users size={16} />
          </span>
          <div>
            <h4 className="font-bold text-mettl-blue text-sm">Active Workload Distribution</h4>
            <p className="text-xs text-slate-400">Total tickets assigned per agent, grouped strictly by team</p>
          </div>
        </div>

        {workloadData.length === 0 ? (
          <p className="text-slate-400 text-xs italic text-center py-6">No assignee workload data available for this team selection.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="workload-groups">
            
            {/* Personality Team */}
            <div className="space-y-3.5">
              <h5 className="text-xs font-bold text-emerald-800 bg-mettl-green-light px-3 py-1.5 rounded-xl inline-block">
                Personality Division Workload
              </h5>
              <div className="space-y-3">
                {workloadData.filter(w => w.team === 'Personality').length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No Personality assignments.</p>
                ) : (
                  workloadData.filter(w => w.team === 'Personality').map(w => {
                    const ratio = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0;
                    return (
                      <div key={w.name} className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-150">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">{w.name}</span>
                          <span className="font-mono text-slate-500">
                            {w.completed} Completed / {w.pending} Pending ({w.total} total)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                          <div className="bg-mettl-blue h-full" style={{ width: `${ratio}%` }} title="Complete" />
                          <div className="bg-mettl-blue h-full" style={{ width: `${100 - ratio}%` }} title="Pending" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cognitive Team */}
            <div className="space-y-3.5">
              <h5 className="text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1.5 rounded-xl inline-block">
                Cognitive Division Workload
              </h5>
              <div className="space-y-3">
                {workloadData.filter(w => w.team === 'Cognitive').length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No Cognitive assignments.</p>
                ) : (
                  workloadData.filter(w => w.team === 'Cognitive').map(w => {
                    const ratio = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0;
                    return (
                      <div key={w.name} className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-150">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-800">{w.name}</span>
                          <span className="font-mono text-slate-500">
                            {w.completed} Completed / {w.pending} Pending ({w.total} total)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                          <div className="bg-mettl-blue h-full" style={{ width: `${ratio}%` }} title="Complete" />
                          <div className="bg-mettl-blue h-full" style={{ width: `${100 - ratio}%` }} title="Pending" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
