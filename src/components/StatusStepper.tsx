import React from 'react';
import { Ticket } from '../types';
import { Check } from 'lucide-react';

interface StatusStepperProps {
  currentStatus: Ticket['status'];
  onChange?: (newStatus: Ticket['status']) => void;
  readOnly?: boolean;
}

const PIPELINE: Ticket['status'][] = [
  'In Progress',
  'Review Pending',
  'Review Approved',
  'Delivered'
];

export function StatusStepper({ currentStatus, onChange, readOnly = false }: StatusStepperProps) {
  const currentIndex = PIPELINE.indexOf(currentStatus);

  return (
    <div className="flex items-center w-full justify-between relative mt-3 mb-8">
      {/* Background connector line */}
      <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 z-0 rounded-full" />
      
      {/* Active connector line */}
      <div 
        className="absolute top-4 left-6 h-1 bg-mettl-green z-0 rounded-full transition-all duration-500" 
        style={{ width: `calc(${currentIndex * (100 / (PIPELINE.length - 1))}% - ${currentIndex === 0 ? '0px' : '24px'})` }} 
      />

      {PIPELINE.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isFuture = index > currentIndex;

        let circleClass = '';
        let textClass = '';

        if (isCompleted) {
          circleClass = 'bg-mettl-green text-white border-mettl-green hover:bg-emerald-600 shadow-md shadow-emerald-500/20';
          textClass = 'text-mettl-green font-semibold';
        } else if (isActive) {
          circleClass = 'bg-white border-2 border-mettl-blue text-mettl-blue shadow-[0_0_12px_rgba(0,157,224,0.4)] scale-110';
          textClass = 'text-mettl-blue font-bold translate-y-1';
        } else {
          circleClass = 'bg-slate-50 border-2 border-slate-200 text-slate-400 hover:border-slate-300';
          textClass = 'text-slate-400 font-medium';
        }

        return (
          <div 
            key={status}
            className={`flex flex-col items-center relative z-10 w-24 ${!readOnly ? 'cursor-pointer group' : ''}`}
            onClick={() => !readOnly && onChange && onChange(status)}
          >
            <div 
              className={`
                flex items-center justify-center rounded-full transition-all duration-300 w-8 h-8 text-sm font-semibold
                ${circleClass}
                ${!readOnly && isFuture ? 'group-hover:border-mettl-blue/50 group-hover:text-mettl-blue/80' : ''}
              `}
            >
              {isCompleted ? <Check size={16} strokeWidth={3} /> : index + 1}
            </div>
            <span className={`absolute top-10 text-[10px] w-full text-center uppercase tracking-wider transition-all duration-300 ${textClass}`}>
              {status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
