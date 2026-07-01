import React, { useState, useMemo } from 'react';
import { AuditLog, User } from '../types';
import { 
  FileClock, ShieldAlert, Search, Trash2, Filter, Activity, Clock, ShieldCheck, RefreshCw
} from 'lucide-react';

interface AuditLogsTableProps {
  logs: AuditLog[];
  currentUser: User;
  onClearLogs: () => void;
  onDeleteLog?: (id: string) => void;
}

export function AuditLogsTable({ logs, currentUser, onClearLogs, onDeleteLog }: AuditLogsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        log.ticketName.toLowerCase().includes(query) ||
        log.fullName.toLowerCase().includes(query) ||
        log.empId.toLowerCase().includes(query) ||
        (log.details && log.details.toLowerCase().includes(query)) ||
        (log.reason && log.reason.toLowerCase().includes(query));

      const matchesAction = actionFilter === 'All' || log.action === actionFilter;
      const matchesRole = roleFilter === 'All' || log.role === roleFilter;

      return matchesSearch && matchesAction && matchesRole;
    });
  }, [logs, searchQuery, actionFilter, roleFilter]);

  const isAdmin = currentUser.role === 'Admin';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col h-full" id="audit-logs-panel">
      {/* Header section with admin-only alerts */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4" id="logs-header">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-mettl-blue-light text-mettl-blue rounded-lg">
              <FileClock size={18} />
            </span>
            <h3 className="font-bold text-slate-800 text-lg">System Audit Log & Trail</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operations log capturing deliverables edits, creation reasons, and deletion authorizations.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2" id="admin-controls-box">
            <span className="px-3 py-1 bg-mettl-green-light text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100 flex items-center gap-1.5">
              <ShieldCheck size={14} />
              Admin Authority Active
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear the entire corporate audit history? This cannot be undone.')) {
                    onClearLogs();
                  }
                }}
                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg border border-rose-100 transition-colors flex items-center gap-1"
                id="clear-logs-btn"
              >
                <Trash2 size={12} />
                Clear Logs
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2" id="user-logs-badge">
            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-100 flex items-center gap-1.5 animate-pulse">
              <ShieldAlert size={14} />
              Read-Only Operational View
            </span>
          </div>
        )}
      </div>

      {/* Audit Filters */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/20 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs" id="audit-filters-grid">
        {/* Search */}
        <div className="relative flex items-center md:col-span-2">
          <Search className="absolute left-3 text-slate-400" size={14} />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-hidden focus:border-mettl-blue-light0 font-medium text-slate-800"
            placeholder="Search logs by keyword, POC, or Ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="audit-search-input"
          />
        </div>

        {/* Action filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-700 outline-hidden focus:border-mettl-blue-light0"
          id="audit-action-select"
        >
          <option value="All">All Actions</option>
          <option value="Create">Create Row</option>
          <option value="Update">Update Row</option>
          <option value="Delete">Delete Row</option>
          <option value="Status Toggle">Status Toggle</option>
          <option value="Import">Excel Import</option>
        </select>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-700 outline-hidden focus:border-mettl-blue-light0"
          id="audit-role-select"
        >
          <option value="All">All Roles</option>
          <option value="Admin">Admin Changes</option>
          <option value="Team Member">Standard User Changes</option>
        </select>
      </div>

      {/* Log list/table */}
      <div className="overflow-x-auto" id="audit-logs-table-container">
        <table className="w-full text-left border-collapse text-xs" id="audit-table">
          <thead>
            <tr className="bg-slate-100/60 border-b border-slate-200 font-mono font-semibold text-slate-500 select-none">
              <th className="py-3 px-4 w-40">Timestamp</th>
              <th className="py-3 px-4 w-40">User & ID</th>
              <th className="py-3 px-4 w-28">Role</th>
              <th className="py-3 px-4 w-32">Action Type</th>
              <th className="py-3 px-4">Action Details</th>
              <th className="py-3 px-4 w-48">Edit Reason</th>
              {isAdmin && <th className="py-3 px-4 w-12 text-center"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredLogs.length === 0 ? (
              <tr id="empty-logs-row">
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Activity className="text-slate-300 stroke-[1.5]" size={36} />
                    <p className="font-semibold text-slate-500 text-sm">No activity logs recorded</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      All row creation, modification reasons, and deletes will populate here in real-time.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const isStatusToggle = log.action === 'Status Toggle';
                const isUpdate = log.action === 'Update';
                const isDelete = log.action === 'Delete';

                return (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/50 transition-colors"
                    id={`log-row-${log.id}`}
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {new Date(log.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', minute: '2-digit', second: '2-digit' 
                        })}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(log.timestamp).toISOString().split('T')[0]}
                      </span>
                    </td>

                    {/* User & ID */}
                    <td className="py-2.5 px-4 text-slate-700 font-semibold whitespace-nowrap">
                      <div className="truncate max-w-[150px]" title={log.fullName}>
                        {log.fullName}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-normal block mt-0.5">
                        ID: {log.empId}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-2.5 px-4">
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        log.role === 'Admin' 
                          ? 'bg-mettl-blue-light text-indigo-700 border border-indigo-100'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {log.role}
                      </span>
                    </td>

                    {/* Action Type */}
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap inline-block ${
                        log.action === 'Create'
                          ? 'bg-mettl-green-light text-emerald-700'
                          : log.action === 'Update'
                          ? 'bg-blue-50 text-blue-700'
                          : log.action === 'Delete'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Action Details */}
                    <td className="py-2.5 px-4 text-slate-600">
                      <div className="font-semibold text-slate-800 line-clamp-1 truncate max-w-sm" title={log.ticketName}>
                        {log.ticketName}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">
                        {log.details}
                      </span>
                    </td>

                    {/* Edit Reason */}
                    <td className="py-2.5 px-4 text-slate-700">
                      {log.reason ? (
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-600 italic border border-slate-100 max-w-[200px] truncate" title={log.reason}>
                          &ldquo;{log.reason}&rdquo;
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-normal">-</span>
                      )}
                    </td>

                    {/* Admin Delete Action */}
                    {isAdmin && (
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this log entry? This cannot be undone.')) {
                              onDeleteLog && onDeleteLog(log.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Log Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer statistics */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex justify-between items-center select-none">
        <span>Logged Events: {filteredLogs.length} of {logs.length}</span>
        <span>Corporate Audit Trail Compliance Portal</span>
      </div>
    </div>
  );
}
