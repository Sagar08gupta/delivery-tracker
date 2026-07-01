import React, { useState, useEffect, useMemo } from 'react';
import { Ticket } from '../types';
import { 
  Clock, CheckCircle2, Copy, Check, Info, AlertTriangle, PlayCircle,
  Mail, Plus, Trash2, Terminal, FileSpreadsheet
} from 'lucide-react';

interface EodReportPanelProps {
  tickets: Ticket[];
}

export function EodReportPanel({ tickets }: EodReportPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [simulate8Pm, setSimulate8Pm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Recipient email addresses state (Section 3: manually add at least EOD recipient emails)
  const [recipients, setRecipients] = useState<string[]>(() => {
    const saved = localStorage.getItem('eod_recipient_emails');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return ['ayushguptaexcel@gmail.com'];
      }
    }
    return ['ayushguptaexcel@gmail.com'];
  });
  
  const [emailInput, setEmailInput] = useState('');

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine if it is past 8:00 PM
  const isPast8Pm = useMemo(() => {
    if (simulate8Pm) return true;
    const hours = currentTime.getHours();
    return hours >= 20; // 20:00 is 8:00 PM
  }, [currentTime, simulate8Pm]);

  // Calculate countdown to 8:00 PM today
  const countdownText = useMemo(() => {
    if (isPast8Pm) return 'EOD Report Active';

    const target = new Date();
    target.setHours(20, 0, 0, 0); // 8:00 PM today

    const diffMs = target.getTime() - currentTime.getTime();
    if (diffMs <= 0) return '00:00:00';

    const secs = Math.floor((diffMs / 1000) % 60);
    const mins = Math.floor((diffMs / (1000 * 60)) % 60);
    const hrs = Math.floor((diffMs / (1000 * 60 * 60)) % 24);

    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }, [currentTime, isPast8Pm]);

  // Outstanding tickets
  const remainingTickets = useMemo(() => {
    return tickets.filter(t => t.status !== 'Delivered');
  }, [tickets]);

  // Outstanding tickets due TODAY or earlier (Overdue)
  const remainingDueTodayOrEarlier = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tickets.filter(t => 
      t.status !== 'Delivered' && t.dueDate <= todayStr
    );
  }, [tickets]);

  // Add email recipient
  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      if (!recipients.includes(cleanEmail)) {
        const updated = [...recipients, cleanEmail];
        setRecipients(updated);
        localStorage.setItem('eod_recipient_emails', JSON.stringify(updated));
      }
      setEmailInput('');
    } else {
      alert('Please enter a valid email address.');
    }
  };

  // Remove email recipient
  const handleRemoveRecipient = (emailToRemove: string) => {
    const updated = recipients.filter(email => email !== emailToRemove);
    setRecipients(updated);
    localStorage.setItem('eod_recipient_emails', JSON.stringify(updated));
  };

  // Format the EOD summary for copying or email body (Excel format outline)
  const formattedSummary = useMemo(() => {
    const todayStr = new Date().toLocaleDateString(undefined, { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const completed = tickets.filter(t => t.status === 'Delivered');
    const pending = remainingTickets;

    let text = `📢 METTL CORPORATE DELIVERABLES END-OF-DAY STATUS REPORT\n`;
    text += `📅 Date: ${todayStr}\n`;
    text += `------------------------------------------------------------\n`;
    text += `✅ Completed Deliverables: ${completed.length}\n`;
    text += `⚠️ Pending Outstanding Deliverables: ${pending.length}\n`;
    text += `------------------------------------------------------------\n\n`;

    if (pending.length === 0) {
      text += `🎉 All clear! All Personality and Cognitive tickets have been successfully delivered.`;
    } else {
      text += `📌 OUTSTANDING EXCEL-FORMAT REPORT DETAILS:\n`;
      text += `Ticket ID\tClient Name\tType of Deliverable\tAssigned To\tReviewer\tDue Date\tRegion\tTeam\n`;
      pending.forEach((t) => {
        text += `${t.ticketId}\t${t.clientName}\t${t.deliverableType}\t${t.assignedTo}\t${t.reviewerName}\t${t.dueDate}\t${t.region}\t${t.team}\n`;
      });
    }

    text += `\n\nGenerated via Psychometric Deliverable Tracker.`;
    return text;
  }, [tickets, remainingTickets]);

  // Generate mailto: link
  const emailMailtoLink = useMemo(() => {
    const todayStr = new Date().toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
    const subject = encodeURIComponent(`⚠️ Pending Deliverables Daily Report - ${todayStr}`);
    const body = encodeURIComponent(formattedSummary + `\n\n*Please find the exported backing spreadsheet (Excel) attached to this email.*`);
    const to = recipients.join(',');
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [recipients, formattedSummary]);

  // macOS 8:00 PM Mail automation AppleScript
  const macAppleScript = useMemo(() => {
    const todayStr = new Date().toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
    const cleanBody = formattedSummary.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `on run
    tell application "Mail"
        set recipientList to {${recipients.map(r => `"${r}"`).join(', ')}}
        set theMessage to make new outgoing message with properties {subject:"Pending Deliverables Daily Report - ${todayStr}", content:"${cleanBody}\\n\\nGenerated automatically by macOS daemon at 8:00 PM.", visible:true}
        tell theMessage
            repeat with r in recipientList
                make new to recipient with properties {address:r}
            end repeat
        end tell
    end tell
end run`;
  }, [recipients, formattedSummary]);

  // Handle copy summary
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle copy Mac Applescript
  const handleCopyScript = () => {
    navigator.clipboard.writeText(macAppleScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Format local current time for display
  const displayLocalTime = currentTime.toLocaleTimeString([], { 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });

  return (
    <div className="bg-white text-slate-800 rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 relative" id="eod-report-container">
      {/* Absolute accent background flare */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -z-1" />

      {/* Header section with live clock */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4" id="eod-header">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-mettl-green-light text-emerald-800 text-xs font-bold uppercase tracking-wider inline-block">
            End of Day Compliance
          </span>
          <h3 className="text-lg font-bold mt-1 tracking-tight text-mettl-blue">8:00 PM Deliverables Status</h3>
        </div>

        {/* Dynamic simulator trigger */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200" id="simulator-toggle-box">
          <span className="text-[11px] font-semibold text-slate-500 pl-2">Simulator:</span>
          <button
            onClick={() => setSimulate8Pm(!simulate8Pm)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              simulate8Pm 
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
            id="toggle-simulator-btn"
          >
            {simulate8Pm ? <Check size={12} /> : <PlayCircle size={12} />}
            {simulate8Pm ? 'Forced 8:00 PM' : 'Live Clock'}
          </button>
        </div>
      </div>

      {/* Clock grid stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 py-5" id="eod-clocks-row">
        {/* Local Clock */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
          <div className="p-2.5 bg-white text-slate-600 rounded-lg border border-slate-200 shadow-2xs">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">System Time</span>
            <span className="text-base font-bold font-mono text-slate-800 mt-0.5 block">
              {simulate8Pm ? '08:00:00 PM' : displayLocalTime}
            </span>
          </div>
        </div>

        {/* Countdown to 8 PM */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
          isPast8Pm 
            ? 'bg-mettl-green-light border-emerald-100 text-emerald-800' 
            : 'bg-slate-50/50 border-slate-100'
        }`}>
          <div className={`p-2.5 rounded-lg border ${
            isPast8Pm 
              ? 'bg-emerald-100/50 text-emerald-600 border-emerald-200' 
              : 'bg-white text-slate-600 border-slate-200 shadow-2xs'
          }`}>
            <Clock size={20} className={isPast8Pm ? '' : 'animate-pulse'} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Countdown to 8 PM</span>
            <span className="text-base font-bold font-mono text-slate-800 mt-0.5 block">
              {countdownText}
            </span>
          </div>
        </div>

        {/* Outstanding Metrics Alert */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 ${
          remainingTickets.length === 0
            ? 'bg-mettl-green-light border-emerald-100 text-emerald-800'
            : remainingDueTodayOrEarlier.length > 0
            ? 'bg-rose-50 border-rose-100 text-rose-800'
            : 'bg-amber-50 border-amber-100 text-amber-850'
        }`}>
          <div className={`p-2.5 rounded-lg border ${
            remainingTickets.length === 0
              ? 'bg-emerald-100/50 text-emerald-600 border-emerald-200'
              : remainingDueTodayOrEarlier.length > 0
              ? 'bg-rose-100/50 text-rose-600 border-rose-200'
              : 'bg-amber-100/50 text-amber-600 border-amber-200'
          }`}>
            {remainingTickets.length === 0 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Outstanding Tickets</span>
            <span className="text-base font-bold text-slate-800 mt-0.5 block">
              {remainingTickets.length === 0 
                ? 'All Clear!' 
                : `${remainingTickets.length} Tickets Pending`}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        
        {/* Left Side: Tickets Summary */}
        <div className="lg:col-span-7 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between" id="eod-tickets-panel">
          <div>
            <div className="flex items-center justify-between mb-4" id="eod-tickets-header">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-mettl-green animate-pulse" />
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Remaining Outstanding Tickets</h4>
              </div>

              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copied 
                    ? 'bg-mettl-green text-white font-bold' 
                    : 'bg-mettl-blue hover:opacity-90 text-white shadow-xs'
                }`}
                id="copy-report-btn"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied Details!' : 'Copy Excel Text'}
              </button>
            </div>

            {remainingTickets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2" id="eod-all-complete-state">
                <CheckCircle2 size={36} className="text-mettl-green animate-bounce" />
                <p className="font-bold text-slate-850 text-sm">100% Completed!</p>
                <p className="text-xs text-slate-500">All Personality and Cognitive deliverables have been successfully cleared for today.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-2 text-xs" id="eod-tickets-scroll-box">
                {remainingTickets.map((t, index) => {
                  const isOverdue = t.dueDate < new Date().toISOString().split('T')[0];

                  return (
                    <div 
                      key={t.id}
                      className="bg-white p-3 rounded-xl border border-slate-150 flex items-center justify-between gap-4 transition-all hover:border-blue-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-mettl-blue font-mono font-bold">#{index + 1}</span>
                          <span className="font-mono font-extrabold text-mettl-blue bg-slate-50 px-1.5 py-0.5 rounded">{t.ticketId}</span>
                          <h5 className="font-bold text-slate-800 truncate" title={t.clientName}>
                            {t.clientName}
                          </h5>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap font-medium">
                          <span className="text-slate-600">
                            Deliverable: <strong className="text-slate-800">{t.deliverableType}</strong>
                          </span>
                          <span className="text-slate-350">|</span>
                          <span>
                            Agent: <strong className="text-slate-850">{t.assignedTo} ({t.team})</strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-bold uppercase tracking-wider font-mono">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-bold uppercase tracking-wider font-mono">
                            {t.dueDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Manual Recipient Email Registry */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Recipient registry card */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-mettl-blue">
              <Mail size={16} />
              <h4 className="font-bold text-sm">Recipient Email Registry</h4>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Manually input emails to receive daily 8:00 PM outstanding ticket reports in Excel format. Address list persists automatically on this device.
            </p>

            <form onSubmit={handleAddRecipient} className="flex gap-2">
              <input
                type="email"
                placeholder="e.g. colleague@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-mettl-blue flex-1 min-w-0 font-medium"
              />
              <button
                type="submit"
                className="bg-mettl-blue hover:opacity-95 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              >
                <Plus size={14} /> Add
              </button>
            </form>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {recipients.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic py-2 text-center">
                  No recipient emails configured yet.
                </div>
              ) : (
                recipients.map(email => (
                  <div key={email} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 text-xs shadow-3xs">
                    <span className="text-slate-600 font-mono truncate mr-2" title={email}>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-sm transition-colors cursor-pointer"
                      title="Remove address"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-200">
              <a
                href={emailMailtoLink}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200 shadow-3xs cursor-pointer"
              >
                <Mail size={13} className="text-slate-500" />
                Draft EOD Email Now
              </a>
            </div>
          </div>

          {/* 8:00 PM macOS Script for automation */}
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-mettl-blue">
              <Terminal size={16} />
              <h4 className="font-bold text-sm">macOS 8:00 PM Script</h4>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Run this script in Script Editor on macOS to automatically dispatch Mail at 8:00 PM with the pending ticket data table formatted for Excel compatibility.
            </p>

            <div className="bg-white rounded-lg p-2.5 border border-slate-200 relative font-mono text-[9px] text-slate-500 max-h-32 overflow-y-auto scrollbar-thin">
              <pre className="whitespace-pre-wrap">{macAppleScript}</pre>
            </div>

            <button
              onClick={handleCopyScript}
              className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                copiedScript 
                  ? 'bg-mettl-green text-white font-bold' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-3xs'
              }`}
            >
              {copiedScript ? <Check size={13} /> : <Copy size={13} />}
              {copiedScript ? 'Script Copied!' : 'Copy macOS Script'}
            </button>
          </div>

        </div>

      </div>

      <div className="mt-4 text-[11px] text-slate-500 flex items-start gap-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
        <Info size={14} className="text-mettl-blue shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          <strong>Daily 8:00 PM Excel Dispatch:</strong> Clicking "Copy Excel Text" outputs a tab-separated text block. It copies perfectly as spreadsheet rows! Paste it directly into any Excel file or Apple Numbers sheet to view organized, multi-column ticket stats in your email.
        </p>
      </div>
    </div>
  );
}
