import React from 'react';
import { AppNotification, User } from '../types';
import { Bell, Clock, Trash2, CheckCircle2, X } from 'lucide-react';

interface AdminNotificationsPanelProps {
  notifications: AppNotification[];
  onClearAll: () => void;
  onDeleteNotification?: (id: string) => void;
  currentUser: User;
}

export function AdminNotificationsPanel({ notifications, onClearAll, onDeleteNotification, currentUser }: AdminNotificationsPanelProps) {
  if (currentUser.role !== 'Admin') {
    return null;
  }

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden mt-6 animate-fade-in max-w-4xl mx-auto">
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <span className="p-2 bg-mettl-blue-light text-mettl-blue rounded-xl">
              <Bell size={24} />
            </span>
            Delivery Date Change Notifications
          </h2>
          <p className="text-slate-500 text-sm mt-1">Review reasons provided by users for changing delivery dates.</p>
        </div>
        
        {notifications.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all notifications?')) {
                onClearAll();
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-sm font-semibold rounded-xl border border-slate-200 hover:border-rose-200 transition-colors"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <CheckCircle2 size={48} className="text-emerald-300 mb-4" />
            <p className="text-lg font-semibold text-slate-700">All Caught Up!</p>
            <p className="text-sm">There are no new delivery date changes to review.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className="p-6 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-mettl-blue text-white text-xs font-bold rounded-lg shadow-sm">
                      {notif.ticketId}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      Changed by <span className="text-mettl-blue">{notif.userName}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 line-through decoration-rose-400">{notif.oldDate}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-emerald-600">{notif.newDate}</span>
                  </div>

                  <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reason Provided</p>
                    <p className="text-sm text-slate-800 italic">&ldquo;{notif.reason}&rdquo;</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 whitespace-nowrap bg-white px-3 py-1.5 rounded-full shadow-3xs border border-slate-100">
                    <Clock size={14} />
                    {formatTime(notif.timestamp)}
                  </div>
                  {onDeleteNotification && (
                    <button
                      onClick={() => onDeleteNotification(notif.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
