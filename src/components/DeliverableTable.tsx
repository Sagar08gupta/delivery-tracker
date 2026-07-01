import React, { useState, useMemo, memo } from 'react';
import { Ticket, User } from '../types';
import { 
  Search, Edit2, Trash2, CheckCircle2, AlertTriangle, HelpCircle, 
  Filter, RotateCcw, FileSpreadsheet, Download, Upload, Plus, Trash, Eye, EyeOff,
  Globe, X, RefreshCw, ArrowUpToLine
} from 'lucide-react';
import { exportTicketsToExcel, syncFromGoogleSheet } from '../excelUtils';
import { googleSignIn, syncAllTicketsToGoogleSheets, SPREADSHEET_ID } from '../googleSheetsUtils';

interface DeliverableTableProps {
  tickets: Ticket[];
  currentUser: User;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onSyncMaster?: (setSyncStatus?: (msg: string) => void) => void;
  onRefresh?: () => void;
  onClearAll: () => void;
  regions: string[];
  onAddRegion: (name: string) => void;
  onRemoveRegion: (name: string) => void;
  onAddClick?: () => void;
}

export const DeliverableTable = memo(function DeliverableTable({ 
  tickets, 
  currentUser,
  onEdit, 
  onDelete, 
  onSyncMaster,
  onRefresh,
  onClearAll,
  regions,
  onAddRegion,
  onRemoveRegion,
  onAddClick
}: DeliverableTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [adminTeamFilter, setAdminTeamFilter] = useState<'All' | 'Personality' | 'Cognitive'>(() => {
    if (currentUser?.team === 'Both' && currentUser.loginTeam) {
      return currentUser.loginTeam;
    }
    return 'All';
  });
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All');
  const [reviewerFilter, setReviewerFilter] = useState<string>('All');
  const [showRegionManager, setShowRegionManager] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  const isAdmin = currentUser.role === 'Admin';
  const todayStr = new Date().toISOString().split('T')[0];

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setRegionFilter('All');
    setAdminTeamFilter(currentUser?.team === 'Both' && currentUser.loginTeam ? currentUser.loginTeam : 'All');
    setAssigneeFilter('All');
    setReviewerFilter('All');
  };

  // Derive unique lists of Assignees and Reviewers dynamically from the tickets
  const uniqueAssignees = useMemo(() => {
    const names = new Set<string>();
    tickets.forEach(t => {
      if (t.assignedTo) names.add(t.assignedTo.trim());
    });
    return Array.from(names).filter(Boolean).sort();
  }, [tickets]);

  const uniqueReviewers = useMemo(() => {
    const names = new Set<string>();
    tickets.forEach(t => {
      if (t.reviewerName) names.add(t.reviewerName.trim());
    });
    return Array.from(names).filter(Boolean).sort();
  }, [tickets]);

  const handleAddRegionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName.trim()) return;
    if (regions.includes(newRegionName.trim())) {
      alert('Region already exists!');
      return;
    }
    onAddRegion(newRegionName.trim());
    setNewRegionName('');
  };

  // Perform filtering first, then sort
  const processedTickets = useMemo(() => {
    // 1. Core Team Isolation Filter (Standard Team Members only see their team's data)
    let filtered = tickets;
    if (currentUser.role === 'Admin' && adminTeamFilter !== 'All') {
      filtered = tickets.filter(t => t.team === adminTeamFilter);
    }

    // 2. Search Query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.clientName.toLowerCase().includes(query) ||
        t.deliverableType.toLowerCase().includes(query) ||
        t.ticketId.toLowerCase().includes(query) ||
        t.assignedTo.toLowerCase().includes(query) ||
        t.reviewerName.toLowerCase().includes(query) ||
        (t.comments && t.comments.toLowerCase().includes(query))
      );
    }

    // 3. Status Filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // 4. Region Filter
    if (regionFilter !== 'All') {
      filtered = filtered.filter(t => t.region === regionFilter);
    }

    // 4.5. Assigned To Filter
    if (assigneeFilter !== 'All') {
      filtered = filtered.filter(t => t.assignedTo === assigneeFilter);
    }

    // 4.6. Reviewer Filter
    if (reviewerFilter !== 'All') {
      filtered = filtered.filter(t => t.reviewerName === reviewerFilter);
    }

    // 5. Default Sort: Due Date, ascending based on the current date (Section 7)
    // - Overdue tickets (Due Date passed, Status !== 'Delivered') sort at the absolute top
    // - Tickets due today or later sort by due date ascending
    // - Completed tickets sort below them
    return [...filtered].sort((a, b) => {
      const isOverdueA = a.dueDate < todayStr && a.status !== 'Delivered';
      const isOverdueB = b.dueDate < todayStr && b.status !== 'Delivered';

      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      // If both are overdue, sort by oldest due date first (ascending)
      if (isOverdueA && isOverdueB) {
        return a.dueDate.localeCompare(b.dueDate);
      }

      // Completed past tickets go to the bottom
      const isCompletedPastA = a.dueDate < todayStr && a.status === 'Delivered';
      const isCompletedPastB = b.dueDate < todayStr && b.status === 'Delivered';

      if (isCompletedPastA && !isCompletedPastB) return 1;
      if (!isCompletedPastA && isCompletedPastB) return -1;

      // Standard sort: chronological ascending
      return a.dueDate.localeCompare(b.dueDate);
    });

  }, [tickets, currentUser, adminTeamFilter, searchQuery, statusFilter, regionFilter, assigneeFilter, reviewerFilter, todayStr]);



  return (
    <div className="space-y-6" id="ticket-table-container">
      
      {/* Search and Filters Toolbar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5" id="toolbar">
        <div className="flex flex-col lg:flex-row justify-between gap-4" id="toolbar-grid">
          
          {/* Filters Row */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:bg-white focus:border-mettl-blue rounded-2xl outline-hidden transition-all text-slate-800"
                placeholder="Search Client, Deliverable or Agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:bg-white focus:border-mettl-blue rounded-xl outline-hidden text-slate-800 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Review Pending">Review Pending</option>
              <option value="Review Approved">Review Approved</option>
              <option value="Delivered">Delivered</option>
            </select>

            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:bg-white focus:border-mettl-blue rounded-xl outline-hidden text-slate-800 cursor-pointer"
            >
              <option value="All">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Assigned To Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:bg-white focus:border-mettl-blue rounded-xl outline-hidden text-slate-800 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
            >
              <option value="All">All Assignees</option>
              {uniqueAssignees.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Reviewer Filter */}
            <select
              value={reviewerFilter}
              onChange={(e) => setReviewerFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 border border-slate-200 focus:bg-white focus:border-mettl-blue rounded-xl outline-hidden text-slate-800 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
            >
              <option value="All">All Reviewers</option>
              {uniqueReviewers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Team Switcher (Visible to Admins only) */}
            {isAdmin ? (
              <select
                value={adminTeamFilter}
                onChange={(e) => setAdminTeamFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-50 border-emerald-300 font-semibold text-mettl-blue hover:bg-slate-100/70 border focus:bg-white focus:border-mettl-blue rounded-xl outline-hidden cursor-pointer"
              >
                <option value="All">All Workspaces Combined</option>
                <option value="Personality">Personality Workspace</option>
                <option value="Cognitive">Cognitive Workspace</option>
              </select>
            ) : (
              <div className="px-3 py-2 text-xs bg-slate-50 border border-slate-150 rounded-xl text-slate-500 font-medium flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-mettl-green animate-pulse" />
                Team: {currentUser.team === 'Both' ? currentUser.loginTeam : currentUser.team} Isolated
              </div>
            )}
          </div>

          {/* Quick Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2" id="toolbar-actions">
            
            {/* Primary Add Delivery Button */}
            {onAddClick && (
              <button
                onClick={onAddClick}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                title="Create a new delivery ticket"
                id="add-ticket-btn"
              >
                <Plus size={14} className="stroke-[2.5]" />
                Add Delivery
              </button>
            )}

            {/* Region Manager Toggle for Admin */}
            {isAdmin && (
              <button
                onClick={() => setShowRegionManager(!showRegionManager)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  showRegionManager 
                    ? 'bg-mettl-blue text-white border-mettl-blue' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Manage Regions
              </button>
            )}

            {/* Refresh Data from LocalStorage */}
            <button
              onClick={() => onRefresh?.()}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Refresh Data from Offline Source"
            >
              <RotateCcw size={14} />
            </button>
            
            {/* Clear Filters */}
            <button
              onClick={handleResetFilters}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Reset Filters"
            >
              <Filter size={14} />
            </button>

            {/* Excel Download — Admin only (Phase 3) */}
            {isAdmin && (
              <button
                onClick={() => exportTicketsToExcel(processedTickets)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Download backup Excel sheet"
              >
                <Download size={14} />
                Export
              </button>
            )}

            {/* Google Sheets Live Sync Trigger */}
            <button
              onClick={() => onSyncMaster?.(setIsSyncing)}
              disabled={isSyncing}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                isSyncing 
                  ? 'bg-slate-100 text-slate-500 border-slate-200' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Synchronize data directly from live Master Google Sheet"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Master Sheet'}
            </button>
          </div>
        </div>

        {/* ADMIN REGION MANAGER EXPANSION DRAWER */}
        {isAdmin && showRegionManager && (
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-fade-in" id="region-manager-drawer">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <h5 className="text-xs font-bold text-mettl-blue uppercase tracking-wider">Admin Region Manager</h5>
              <button onClick={() => setShowRegionManager(false)} className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer">Close</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form onSubmit={handleAddRegionSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add new region... (e.g. LATAM)"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 flex-1 outline-hidden focus:border-mettl-blue"
                />
                <button
                  type="submit"
                  className="bg-mettl-blue text-white px-3 py-1.5 text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Add
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white rounded-lg border border-slate-150">
                {regions.map(r => (
                  <div key={r} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                    <span>{r}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveRegion(r)}
                      disabled={regions.length <= 1}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                    >
                      <Trash size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Main Ticket Grid / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden" id="ticket-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="tickets-data-table">
            
            {/* Headers - Mettl Blue backing with clean white text */}
            <thead className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-4 text-center border-b border-mettl-blue-dark w-12">#</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark whitespace-nowrap">Ticket ID</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark max-w-[200px]">Client Name</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark max-w-[200px]">Type of Deliverable</th>
                <th className="py-4 px-5 border-b border-mettl-blue-dark max-w-[300px]">Comments</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark whitespace-nowrap">Assigned To</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark whitespace-nowrap">Reviewer</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark text-center whitespace-nowrap">Due Date</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark text-center whitespace-nowrap">Status</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark text-center whitespace-nowrap">Region</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark text-center whitespace-nowrap">Content Team</th>
                <th className="py-4 px-4 border-b border-mettl-blue-dark text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200 text-sm text-slate-800 font-medium border-t border-slate-200 shadow-inner">
              {processedTickets.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HelpCircle size={32} className="text-slate-350" />
                      <p className="font-semibold text-slate-650">No tickets found matching your active filters.</p>
                      <p className="text-xs text-slate-400">Try refining search parameters or reset using the reload button.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedTickets.map((ticket, index) => {
                  const isOverdue = ticket.dueDate < todayStr && ticket.status !== 'Delivered';
                  const isDueToday = ticket.dueDate === todayStr;

                  // Evaluate row-level comment editing permissions
                  // Comments are editable only by Admin, and the user listed in "Assigned To"
                  const canEditCommentInline = isAdmin || currentUser.fullName === ticket.assignedTo;

                  return (
                    <tr 
                      key={ticket.id} 
                      className={`hover:bg-blue-50/40 hover:shadow-sm transition-all duration-200 group bg-white ${
                        isOverdue 
                          ? 'bg-rose-50/20' 
                          : isDueToday 
                          ? 'bg-amber-50/15' 
                          : ''
                      }`}
                      id={`ticket-row-${ticket.id}`}
                    >
                      {/* Row Counter # */}
                      <td className="py-4 px-5 text-center font-mono text-xs text-slate-400 border-r border-slate-50">
                        {index + 1}
                      </td>

                      {/* Ticket ID */}
                      <td className="py-4 px-5 font-mono font-bold text-mettl-blue text-xs whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              ticket.team === 'Cognitive' ? 'bg-sky-400' : 'bg-mettl-green'
                            }`} title={`Team: ${ticket.team}`} />
                            <span>{ticket.ticketId}</span>
                          </div>
                          
                          {/* Phase 10: Task Role Badge */}
                          {currentUser?.fullName === ticket.reviewerName ? (
                            <span className="w-max px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Review
                            </span>
                          ) : currentUser?.fullName === ticket.assignedTo ? (
                            <span className="w-max px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-mettl-blue-light text-mettl-blue border border-blue-200">
                              Delivery
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Client Name */}
                      <td className="py-4 px-5 max-w-[200px] truncate" title={ticket.clientName}>
                        <span className="font-semibold text-slate-900">{ticket.clientName}</span>
                      </td>

                      {/* Type of Deliverable */}
                      <td className="py-4 px-5 text-xs font-normal text-slate-600 max-w-[200px] truncate" title={ticket.deliverableType}>
                        {ticket.deliverableType}
                      </td>

                      {/* Comments / Inline preview */}
                      <td className="py-4 px-6 text-xs text-slate-500 max-w-[300px]">
                        <div className="relative group/cell">
                          {ticket.comments ? (
                            <p className="leading-relaxed truncate" title={ticket.comments}>
                              {ticket.comments}
                            </p>
                          ) : (
                            <span className="text-slate-350 italic truncate block">No comments</span>
                          )}
                          {!canEditCommentInline && ticket.comments && (
                            <span className="text-[9px] text-slate-400 font-mono block mt-0.5 select-none">(read-only)</span>
                          )}
                        </div>
                      </td>

                      {/* Assigned To */}
                      <td className="py-4 px-5 text-xs whitespace-nowrap">
                        <span className="bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-full text-slate-700 shadow-3xs inline-block">
                          {ticket.assignedTo}
                        </span>
                      </td>

                      {/* Reviewer Name */}
                      <td className="py-4 px-5 text-xs text-slate-600 whitespace-nowrap">
                        <span>{ticket.reviewerName}</span>
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="inline-block">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                            isOverdue 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : isDueToday 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-50 text-slate-650'
                          }`}>
                            {ticket.dueDate}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] text-rose-600 font-mono font-semibold block mt-1 animate-pulse">
                              Overdue!
                            </span>
                          )}
                          {isDueToday && (
                            <span className="text-[10px] text-amber-600 font-mono font-semibold block mt-1">
                              Due Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 mx-auto ${
                            ticket.status === 'Delivered'
                              ? 'bg-mettl-green-light text-emerald-800 border border-emerald-200 shadow-3xs'
                              : ticket.status === 'Review Approved'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-3xs'
                              : ticket.status === 'Review Pending'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200 shadow-3xs'
                              : 'bg-amber-50 text-amber-850 border border-amber-200 shadow-3xs'
                          }`}
                        >
                          {ticket.status === 'Delivered' ? (
                            <>
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Delivered</span>
                            </>
                          ) : ticket.status === 'Review Approved' ? (
                            <>
                              <CheckCircle2 size={13} className="text-blue-600" />
                              <span>Approved</span>
                            </>
                          ) : ticket.status === 'Review Pending' ? (
                            <>
                              <AlertTriangle size={13} className="text-purple-500" />
                              <span>Pending</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={13} className="text-amber-500 animate-pulse" />
                              <span>In Progress</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Region */}
                      <td className="py-4 px-5 text-center text-xs whitespace-nowrap">
                        <span className={`font-mono border px-2.5 py-1 rounded-full text-[10px] font-bold shadow-3xs ${
                          ticket.region === 'APAC'
                            ? 'bg-mettl-green-light text-emerald-700 border-emerald-200'
                            : ticket.region === 'EMEA'
                            ? 'bg-mettl-blue-light text-indigo-700 border-indigo-200'
                            : ticket.region === 'AMER'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : ticket.region === 'India'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {ticket.region}
                        </span>
                      </td>

                      {/* Content Team */}
                      <td className="py-4 px-5 text-center text-xs whitespace-nowrap">
                        {ticket.contentTeamInvolved ? (
                          <span className="font-mono border px-2.5 py-1 rounded-full text-[10px] font-bold shadow-3xs bg-emerald-50 text-emerald-700 border-emerald-200" title={ticket.contentTeamNames?.join(', ')}>
                            Creation Required
                          </span>
                        ) : (
                          <span className="font-mono border px-2.5 py-1 rounded-full text-[10px] font-bold shadow-3xs bg-rose-50 text-rose-700 border-rose-200">
                            No Creation
                          </span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                          
                          {/* Edit (available if user is Admin or assigned to the ticket) */}
                          <button
                            onClick={() => onEdit(ticket)}
                            className="p-1.5 bg-slate-50 hover:bg-mettl-blue-light hover:text-mettl-blue border border-slate-200 hover:border-blue-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Ticket details"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete (Admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ticket ${ticket.ticketId}?`)) {
                                  onDelete(ticket.id);
                                }
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Delete Ticket"
                            >
                              <Trash2 size={13} />
                            </button>
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

        {/* Excel compliance footer log */}
        <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500" id="table-footer">
          <span>
            Showing <strong className="text-slate-700">{processedTickets.length}</strong> of <strong className="text-slate-700">{tickets.length}</strong> corporate tracking tickets.
          </span>
          <span className="font-mono text-[10px] uppercase text-mettl-blue/80 font-bold tracking-wider">
            Psychometric Deliverable Tracker
          </span>
        </div>

      </div>

    </div>
  );
});
