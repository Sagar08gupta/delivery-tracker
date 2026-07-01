import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setCurrentMonth(date.getMonth());
        setCurrentYear(date.getFullYear());
      }
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    // Adjust for timezone offset to avoid getting previous day due to local time
    const adjustedDate = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000);
    const dateStr = adjustedDate.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const selectedStr = value;

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedStr;

      days.push(
        <button
          key={i}
          type="button"
          onClick={() => handleSelectDate(i)}
          className={`w-8 h-8 flex items-center justify-center text-xs font-medium rounded-full transition-all cursor-pointer ${
            isSelected
              ? 'bg-mettl-blue text-white shadow-md'
              : isToday
              ? 'bg-slate-100 text-mettl-blue font-bold border border-mettl-blue/30'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  // Format display value
  const displayValue = value ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={`w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-mettl-blue focus-within:ring-2 focus-within:ring-mettl-blue/10 rounded-xl transition-all flex items-center ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="absolute left-3 text-slate-400">
          <CalendarIcon size={15} />
        </div>
        <span className={displayValue ? 'text-slate-800' : 'text-slate-400'}>
          {displayValue || 'Select a date'}
        </span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full mt-2 left-0 z-50 w-[280px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button 
              type="button" 
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-mettl-blue hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="font-bold text-sm text-slate-800">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <button 
              type="button" 
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-mettl-blue hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 place-items-center">
              {renderCalendar()}
            </div>
          </div>
          
          <div className="p-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                onChange(today);
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-mettl-blue hover:text-mettl-blue/80 transition-colors cursor-pointer px-2"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
