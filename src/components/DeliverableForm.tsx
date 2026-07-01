import React, { useState, useEffect } from 'react';
import { Ticket, User } from '../types';
import { Save, X, ClipboardList, UserCheck, Calendar, CheckSquare, MessageSquare, Plus, Globe, UserPlus } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { StatusStepper } from './StatusStepper';

interface DeliverableFormProps {
  onAdd: (ticket: Omit<Ticket, 'id' | 'createdAt'>) => void;
  onUpdate: (ticket: Ticket, reason?: string) => void;
  editingTicket?: Ticket | null;
  existingTickets?: Ticket[];
  cancelEdit: () => void;
  currentUser: User;
  regions: string[];
  isModal?: boolean;
}

export function DeliverableForm({ onAdd, onUpdate, editingTicket, existingTickets = [], cancelEdit, currentUser, regions, isModal }: DeliverableFormProps) {
  const [ticketId, setTicketId] = useState('');
  const [clientName, setClientName] = useState('');
  const [deliverableType, setDeliverableType] = useState('');
  const [comments, setComments] = useState('');
  const [assignedTo, setAssignedTo] = useState(editingTicket?.assignedTo || currentUser?.fullName || '');
  const [reviewerName, setReviewerName] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<Ticket['status']>('In Progress');
  const [region, setRegion] = useState('India');
  const [deliveryDate, setDeliveryDate] = useState('');
  
  const [contentTeamInvolved, setContentTeamInvolved] = useState(editingTicket?.contentTeamInvolved || false);
  const [contentTeamNames, setContentTeamNames] = useState<string[]>(editingTicket?.contentTeamNames || []);
  const [showContentModal, setShowContentModal] = useState(false);
  const [tempContentNames, setTempContentNames] = useState('');
  
  // Reason modal state (Phase 7)
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonText, setReasonText] = useState('');
  
  // Selected team for Admin creating a ticket. Standard users are locked to their own team.
  const [selectedTeam, setSelectedTeam] = useState<'Personality' | 'Cognitive'>('Personality');
  const [error, setError] = useState('');

  // Quick user creation state for admin
  const [showQuickAddUser, setShowQuickAddUser] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');

  // Get users belonging to the currently selected team to populate Assignee and Reviewer lists
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  const isDuplicateId = ticketId.trim() !== '' && existingTickets.some(t => 
    t.ticketId.trim().toUpperCase() === ticketId.trim().toUpperCase() && 
    t.id !== editingTicket?.id
  );

  // Determine the active team for this ticket
  const activeTeam = editingTicket 
    ? editingTicket.team 
    : (currentUser.role === 'Admin' ? selectedTeam : (currentUser.team === 'Both' ? (currentUser.loginTeam || 'Personality') : currentUser.team));

  const loadTeamMembers = () => {
    
    // Retrieve users from localStorage
    const savedUsersStr = localStorage.getItem('corporate_users');
    if (savedUsersStr) {
      try {
        const allUsers: User[] = JSON.parse(savedUsersStr);
        // Filter users belonging to this specific team, or cross-functional users
        // PHASE 3: Exclude Admin-role accounts from Reviewer/Assignee lists
        const filtered = allUsers.filter(u => {
          if (u.role === 'Admin') return false;
          return u.team === activeTeam || u.team === 'Both';
        });
        setTeamMembers(filtered);
        return filtered;
      } catch (e) {
        setTeamMembers([]);
      }
    }
    return [];
  };

  useEffect(() => {
    loadTeamMembers();
  }, [selectedTeam, editingTicket, currentUser]);

  // Set default form values
  useEffect(() => {
    if (editingTicket) {
      setTicketId(editingTicket.ticketId);
      setClientName(editingTicket.clientName);
      setDeliverableType(editingTicket.deliverableType);
      setComments(editingTicket.comments);
      setAssignedTo(editingTicket.assignedTo);
      setReviewerName(editingTicket.reviewerName);
      setDueDate(editingTicket.dueDate);
      setStatus(editingTicket.status);
      setRegion(editingTicket.region);
      setSelectedTeam(editingTicket.team);
      setDeliveryDate(editingTicket.deliveryDate || '');
      setContentTeamInvolved(editingTicket.contentTeamInvolved || false);
      setContentTeamNames(editingTicket.contentTeamNames || []);
      setError('');
    } else {
      resetForm();
    }
  }, [editingTicket]);

  // Auto-set reviewer if empty
  useEffect(() => {
    if (!editingTicket) {
      if (!reviewerName && teamMembers.length > 0) {
        setReviewerName(teamMembers[Math.min(1, teamMembers.length - 1)].fullName);
      }
    }
  }, [teamMembers, editingTicket]);

  const resetForm = () => {
    setTicketId('');
    setClientName('');
    setDeliverableType('');
    setComments('');
    setAssignedTo(currentUser?.fullName || '');
    setReviewerName('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setStatus('In Progress');
    setRegion(regions[0] || 'India');
    setDeliveryDate('');
    setContentTeamInvolved(false);
    setContentTeamNames([]);
    if (currentUser.role !== 'Admin') {
      setSelectedTeam(currentUser.team === 'Both' ? (currentUser.loginTeam || 'Personality') : currentUser.team);
    }
    setError('');
  };

  const handleQuickAddUser = () => {
    if (!quickAddName.trim()) return;
    const name = quickAddName.trim();
    const savedUsersStr = localStorage.getItem('corporate_users');
    let allUsers: User[] = [];
    if (savedUsersStr) {
      try {
        allUsers = JSON.parse(savedUsersStr);
      } catch (e) {
        allUsers = [];
      }
    }
    
    // Check if duplicate name
    if (allUsers.some(u => u.fullName.trim().toLowerCase() === name.toLowerCase())) {
      setError('A team member with this name is already registered!');
      return;
    }

    const newId = `user-quick-${Date.now()}`;
    const newUser: User = {
      id: newId,
      email: `${name.toLowerCase().replace(/\s+/g, '')}@mettl.com`,
      fullName: name,
      password: 'password123',
      role: 'Team Member',
      team: activeTeam
    };

    const updated = [...allUsers, newUser];
    localStorage.setItem('corporate_users', JSON.stringify(updated));
    setQuickAddName('');
    setShowQuickAddUser(false);
    
    // Refresh list and auto select
    const filtered = updated.filter(u => u.team === activeTeam);
    setTeamMembers(filtered);
    setAssignedTo(name);
    // If reviewer is unassigned/empty, set it too
    if (!reviewerName || reviewerName === 'Unassigned') {
      setReviewerName(name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ticketId.trim()) {
      setError('Ticket ID is required. Please enter a unique ID.');
      return;
    }
    if (isDuplicateId) {
      setError(`Ticket ID "${ticketId.trim()}" already exists. Please enter a unique ID.`);
      return;
    }
    if (!clientName.trim()) {
      setError('Client Name is required.');
      return;
    }
    if (!deliverableType.trim()) {
      setError('Type of Deliverable is required.');
      return;
    }
    if (!assignedTo) {
      setError('Please assign this ticket to a team member.');
      return;
    }
    if (!reviewerName) {
      setError('Please select a reviewer.');
      return;
    }
    if (assignedTo === reviewerName && teamMembers.length > 1) {
      setError('Ticket Owner and Reviewer should preferably be different teammates.');
      return;
    }

    const activeTeam = currentUser.role === 'Admin' 
      ? selectedTeam 
      : (currentUser.team === 'Both' ? (currentUser.loginTeam || 'Personality') : currentUser.team);

    if (editingTicket) {
      const calculatedDeliveryDate = status === 'Delivered' ? (deliveryDate || new Date().toISOString().split('T')[0]) : undefined;
      
      const updatedTicket = {
        ...editingTicket,
        ticketId: ticketId.trim(),
        clientName: clientName.trim(),
        deliverableType: deliverableType.trim(),
        comments: comments.trim(),
        assignedTo,
        reviewerName,
        dueDate,
        status,
        region,
        contentTeamInvolved,
        contentTeamNames: contentTeamInvolved ? contentTeamNames : undefined,
        team: editingTicket.team, // Keep original team
        deliveryDate: calculatedDeliveryDate
      };

      // PHASE 7: If a non-Admin changes the Delivery Date, intercept and show reason modal
      if (currentUser.role !== 'Admin' && editingTicket.deliveryDate !== calculatedDeliveryDate) {
        setShowReasonModal(true);
        return;
      }

      onUpdate(updatedTicket);
    } else {
      onAdd({
        ticketId: ticketId.trim(),
        clientName: clientName.trim(),
        deliverableType: deliverableType.trim(),
        comments: comments.trim(),
        assignedTo,
        reviewerName,
        dueDate,
        status,
        region,
        contentTeamInvolved,
        contentTeamNames: contentTeamInvolved ? contentTeamNames : undefined,
        team: activeTeam,
        deliveryDate: status === 'Delivered' ? (deliveryDate || new Date().toISOString().split('T')[0]) : undefined
      });
      resetForm();
    }
  };

  const submitWithReason = () => {
    if (!reasonText.trim() || !editingTicket) return;
    
    const calculatedDeliveryDate = status === 'Delivered' ? (deliveryDate || new Date().toISOString().split('T')[0]) : undefined;
    
    onUpdate({
      ...editingTicket,
      ticketId: ticketId.trim(),
      clientName: clientName.trim(),
      deliverableType: deliverableType.trim(),
      comments: comments.trim(),
      assignedTo,
      reviewerName,
      dueDate,
      status,
      region,
      contentTeamInvolved,
      contentTeamNames: contentTeamInvolved ? contentTeamNames : undefined,
      team: editingTicket.team,
      deliveryDate: calculatedDeliveryDate
    }, reasonText.trim());
    
    setShowReasonModal(false);
    setReasonText('');
  };

  // Determine if the current user has permission to edit comments/fields for this ticket
  // PHASE 3 permissions:
  //   Admin: full edit access to all fields on any ticket
  //   Regular User (editing): may ONLY edit Comments and Delivery Date
  const isAssignee = editingTicket && currentUser.fullName && editingTicket.assignedTo && (currentUser.fullName.trim().toLowerCase() === editingTicket.assignedTo.trim().toLowerCase());
  const isReviewer = editingTicket && currentUser.fullName && editingTicket.reviewerName && (currentUser.fullName.trim().toLowerCase() === editingTicket.reviewerName.trim().toLowerCase());
  const canEditComments = !editingTicket || currentUser.role === 'Admin' || isAssignee || isReviewer;
  
  // canEditAllFields: Admin always can; regular users are NEVER allowed to change other fields when editing
  const canEditAllFields = currentUser.role === 'Admin' || !editingTicket;
  
  // Due Date: Users may always edit this field when editing a ticket
  const canEditDueDate = currentUser.role === 'Admin' || true;
  
  // Delivery Date: Users may always edit this field when editing a ticket (Phase 3 allowance)
  const canEditDeliveryDate = currentUser.role === 'Admin' || Boolean(editingTicket);

  return (
    <div className={isModal ? "p-1" : "bg-white rounded-2xl border border-slate-200 shadow-xs p-6"} id="ticket-form-panel">
      {!isModal && (
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5" id="form-header-box">
          <h3 className="font-bold text-mettl-blue text-base flex items-center gap-2" id="form-title">
            <span className="p-1.5 bg-mettl-blue-light text-mettl-blue rounded-2xl">
              <ClipboardList size={18} />
            </span>
            {editingTicket ? `Modify Ticket: ${editingTicket.ticketId}` : 'Create New Delivery'}
          </h3>
          {editingTicket && (
            <button 
              onClick={cancelEdit}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              id="cancel-edit-btn"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" id="ticket-input-form">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl font-semibold border border-rose-150" id="form-error">
            {error}
          </div>
        )}

        {/* TEAM SYSTEM (Locked for members, selectable for admins only on creation) */}
        {!editingTicket && currentUser.role === 'Admin' && (
          <div>
            <label className="block text-xs font-bold text-mettl-blue uppercase tracking-wider mb-1.5">
              Assigned Team Group
            </label>
            <div className="grid grid-cols-2 gap-2" id="team-selector">
              <button
                type="button"
                onClick={() => setSelectedTeam('Personality')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  selectedTeam === 'Personality'
                    ? 'bg-mettl-green-light text-mettl-blue border-mettl-green ring-2 ring-mettl-green/10'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Personality Team
              </button>
              <button
                type="button"
                onClick={() => setSelectedTeam('Cognitive')}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  selectedTeam === 'Cognitive'
                    ? 'bg-sky-50 text-mettl-blue border-mettl-blue ring-2 ring-mettl-blue/10'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Cognitive Team
              </button>
            </div>
          </div>
        )}

        {/* Ticket ID (Required Manual Entry) */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="ticketId">
            Ticket ID <span className="text-rose-500">*</span>
          </label>
          <input
            id="ticketId"
            type="text"
            required
            disabled={editingTicket ? !canEditAllFields : false}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 disabled:bg-slate-100/70 disabled:text-slate-500 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800 font-mono"
            placeholder="Enter a unique Ticket ID (e.g. PSY-2001)"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
          />
          {isDuplicateId && (
            <p className="text-rose-500 text-xs mt-1.5 font-semibold">
              This Ticket ID already exists — please choose a different one.
            </p>
          )}
        </div>

        {/* Client Name & Deliverable Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="clientName">
              Client Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="clientName"
              type="text"
              required
              disabled={!canEditAllFields}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 disabled:bg-slate-100/70 disabled:text-slate-500 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800"
              placeholder="e.g. Google Inc."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="deliverableType">
              Type of Deliverable <span className="text-rose-500">*</span>
            </label>
            <input
              id="deliverableType"
              type="text"
              required
              disabled={!canEditAllFields}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 disabled:bg-slate-100/70 disabled:text-slate-500 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800"
              placeholder="e.g. Cognitive Battery Report"
              value={deliverableType}
              onChange={(e) => setDeliverableType(e.target.value)}
            />
          </div>
        </div>

        {/* Dropdowns (Assigned To & Reviewer) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider font-semibold" htmlFor="assignedTo">
                Ticket Owner <span className="text-rose-500">*</span>
              </label>
              {currentUser.role === 'Admin' && (
                <button
                  type="button"
                  onClick={() => setShowQuickAddUser(!showQuickAddUser)}
                  className="text-xs text-mettl-blue hover:text-mettl-blue font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus size={12} />
                  + Quick Add Teammate
                </button>
              )}
            </div>

            {showQuickAddUser && (
              <div className="mb-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl flex gap-1.5 items-center animate-fade-in shadow-xs">
                <input
                  type="text"
                  placeholder="Type full name..."
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-hidden text-slate-800"
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddUser();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleQuickAddUser}
                  className="px-2.5 py-1 bg-mettl-blue text-white text-xs font-bold rounded-lg hover:bg-mettl-blue cursor-pointer transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddUser(false);
                    setQuickAddName('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <select
              id="assignedTo"
              required
              disabled={!canEditAllFields}
              className="w-full px-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/70 disabled:text-slate-500 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800 cursor-pointer"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              {teamMembers.length === 0 ? (
                <option value="">No members registered for this team</option>
              ) : (
                teamMembers.map(m => (
                  <option key={m.id} value={m.fullName}>{m.fullName}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="reviewerName">
              Reviewer Name <span className="text-rose-500">*</span>
            </label>
            <select
              id="reviewerName"
              required
              disabled={!canEditAllFields}
              className="w-full px-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/70 disabled:text-slate-500 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800 cursor-pointer"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
            >
              {teamMembers.length === 0 ? (
                <option value="">No members registered for this team</option>
              ) : (
                teamMembers.map(m => (
                  <option key={m.id} value={m.fullName}>{m.fullName}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Due Date & Region & Content Team & Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="dueDate">
              Due Date <span className="text-rose-500">*</span>
            </label>
            <DatePicker
              value={dueDate}
              onChange={(value) => setDueDate(value)}
              disabled={!canEditDueDate}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="region">
              Region <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400">
                <Globe size={15} />
              </div>
              <select
                id="region"
                required
                disabled={!canEditAllFields}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 disabled:bg-slate-100/70 disabled:text-slate-500 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800 cursor-pointer"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5" htmlFor="contentTeamInvolved">
              Content Team Involvement <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3 h-[38px] items-center">
              <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="contentTeamInvolved"
                  className="accent-mettl-blue w-4 h-4"
                  checked={contentTeamInvolved}
                  disabled={!canEditAllFields}
                  onChange={() => {
                    setContentTeamInvolved(true);
                    setTempContentNames(contentTeamNames.join(', '));
                    setShowContentModal(true);
                  }}
                />
                <span className="text-slate-800 font-medium">Yes</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="contentTeamInvolved"
                  className="accent-mettl-blue w-4 h-4"
                  checked={!contentTeamInvolved}
                  disabled={!canEditAllFields}
                  onChange={() => {
                    setContentTeamInvolved(false);
                    setContentTeamNames([]);
                  }}
                />
                <span className="text-slate-800 font-medium">No</span>
              </label>
            </div>
            {contentTeamInvolved && contentTeamNames.length > 0 && (
              <div className="mt-1 text-[10px] font-medium text-slate-500 truncate" title={contentTeamNames.join(', ')}>
                {contentTeamNames.join(', ')}
              </div>
            )}
          </div>

          <div className="col-span-1 md:col-span-4 mt-2 mb-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2" htmlFor="status">
              Pipeline Status <span className="text-rose-500">*</span>
            </label>
            <StatusStepper 
              currentStatus={status} 
              onChange={(newStatus) => setStatus(newStatus)}
              readOnly={!canEditAllFields}
            />
          </div>
        </div>

        {status === 'Delivered' && (
          <div className="mt-4 p-4 bg-mettl-green-light/50 border border-emerald-100 rounded-2xl">
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5" htmlFor="deliveryDate">
              Actual Delivery Date <span className="text-rose-500">*</span>
            </label>
            <DatePicker
              value={deliveryDate || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
              onChange={(value) => setDeliveryDate(value)}
              disabled={!canEditDeliveryDate}
            />
          </div>
        )}

        {/* COMMENTS COLUMN */}
        <div className="p-4 bg-mettl-blue-light/50 border border-blue-100 rounded-2xl">
          <label className="block text-xs font-bold text-mettl-blue uppercase tracking-wider mb-1.5 flex items-center gap-1.5" htmlFor="comments">
            <MessageSquare size={14} className="text-mettl-blue" />
            Comments
          </label>
          <textarea
            id="comments"
            rows={3}
            disabled={!canEditComments}
            className="w-full p-3 text-sm bg-white disabled:bg-slate-100/50 disabled:text-slate-500 border border-slate-200 focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800"
            placeholder={
              canEditComments 
                ? "Enter comments, milestones, or feedback details... (optional)" 
                : "Read-Only (Can only be edited by Admin or the Assigned Person)"
            }
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
          {!canEditComments && (
            <span className="text-[10px] text-rose-500 font-medium block mt-1">
              * Row lock active: Comments are editable only by the Assigned Agent or Admin.
            </span>
          )}
        </div>

        {/* Locked Fields warning */}
        {editingTicket && !canEditAllFields && (
          <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-xl border border-amber-200">
            <strong>Restricted Access:</strong> As a Team Member, you may only edit <strong>Comments</strong>, <strong>Due Date</strong>, and <strong>Delivery Date</strong> on this ticket. All other fields are locked to Admin only.
          </div>
        )}

        {/* Action Controls */}
        <div className="flex gap-2.5 pt-4">
          {(!editingTicket || canEditAllFields || canEditComments) && (
            <button
              type="submit"
              className="flex-1 bg-mettl-gradient hover:opacity-90 hover:-translate-y-0.5 text-white font-bold py-3 px-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              id="form-submit"
            >
              <Save size={16} className="text-white" />
              {editingTicket ? 'Save Ticket Changes' : 'Add to Tracker'}
            </button>
          )}

          {editingTicket && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full transition-all text-sm cursor-pointer"
              id="form-cancel"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Quick Add User Modal (Admin only) */}
      {showQuickAddUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="p-1.5 bg-mettl-blue-light text-mettl-blue rounded-lg">
                  <UserPlus size={16} />
                </span>
                Quick Add User
              </h3>
              <button 
                onClick={() => setShowQuickAddUser(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddUser} className="p-5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2" htmlFor="quickName">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="quickName"
                type="text"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800"
                placeholder="Enter new user's name"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 mt-2">
                User will be added to the <strong className="text-slate-700">{activeTeam}</strong> team.
              </p>
              
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddUser(false)}
                  className="flex-1 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-mettl-blue hover:bg-mettl-blue-dark text-white text-sm font-bold rounded-xl shadow-md shadow-mettl-blue/20 transition-all"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content Team Names Modal */}
      {showContentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="p-1.5 bg-mettl-blue-light text-mettl-blue rounded-lg">
                  <UserPlus size={16} />
                </span>
                Content Team Members
              </h3>
              <button 
                onClick={() => {
                  if (contentTeamNames.length === 0) {
                    setContentTeamInvolved(false);
                  }
                  setShowContentModal(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2" htmlFor="contentNames">
                Enter Names <span className="text-rose-500">*</span>
              </label>
              <input
                id="contentNames"
                type="text"
                autoFocus
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden transition-all text-slate-800"
                placeholder="Ankit, Disha, Mohona"
                value={tempContentNames}
                onChange={(e) => setTempContentNames(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const names = tempContentNames.split(',').map(n => n.trim()).filter(n => n);
                    if (names.length === 0) {
                      alert('At least one name is required.');
                      return;
                    }
                    setContentTeamNames(names);
                    setShowContentModal(false);
                  }
                }}
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Provide comma-separated names of the involved content team members.
              </p>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (contentTeamNames.length === 0) {
                    setContentTeamInvolved(false);
                  }
                  setShowContentModal(false);
                }}
                className="flex-1 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const names = tempContentNames.split(',').map(n => n.trim()).filter(n => n);
                  if (names.length === 0) {
                    alert('At least one name is required.');
                    return;
                  }
                  setContentTeamNames(names);
                  setShowContentModal(false);
                }}
                className="flex-1 py-2 bg-mettl-blue hover:bg-mettl-blue-dark text-white text-sm font-bold rounded-xl shadow-md shadow-mettl-blue/20 transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 7: Delivery Date Change Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                  <Calendar size={18} />
                </span>
                Delivery Date Changed
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setShowReasonModal(false);
                  setReasonText('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-slate-600 mb-4">
                You are modifying the <span className="font-bold text-slate-800">Delivery Date</span>. A valid reason must be provided to save this change.
              </p>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Reason for change <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="E.g., Client requested more time for review..."
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:border-mettl-blue focus:ring-2 focus:ring-mettl-blue/10 rounded-xl outline-hidden min-h-[100px] resize-y text-slate-800 placeholder-slate-400"
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReasonModal(false);
                  setReasonText('');
                }}
                className="flex-1 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200 cursor-pointer"
              >
                Cancel Save
              </button>
              <button
                type="button"
                onClick={submitWithReason}
                disabled={!reasonText.trim()}
                className="flex-1 py-2 bg-mettl-blue hover:bg-mettl-blue-dark text-white text-sm font-bold rounded-xl shadow-md shadow-mettl-blue/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
