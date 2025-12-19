
import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number | undefined | null;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minimal?: boolean; // For dashboard header style
  anchor?: 'left' | 'right'; // Control dropdown alignment
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Seleziona...", 
  disabled = false,
  className = "",
  minimal = false,
  anchor = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const handleSelect = (val: string | number) => {
    if (!disabled) {
      onChange(val);
      setIsOpen(false);
    }
  };

  // Base styles
  const containerBase = minimal 
    ? `relative inline-block` 
    : `relative w-full ${className}`;

  const triggerBase = minimal
    ? `flex items-center space-x-2 font-bold text-slate-900 cursor-pointer outline-none transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-70'}`
    : `w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none flex justify-between items-center transition-all ${isOpen ? 'ring-4 ring-blue-50 border-blue-500' : 'hover:bg-slate-100'} ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer bg-slate-50'}`;

  // Dropdown positioning
  const dropdownClasses = `absolute z-[100] mt-2 min-w-[180px] bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar ${anchor === 'right' ? 'right-0' : 'left-0'} ${!minimal ? 'w-full' : ''}`;

  return (
    <div className={containerBase} ref={containerRef}>
      {/* Trigger */}
      <div onClick={() => !disabled && setIsOpen(!isOpen)} className={triggerBase}>
        <span className={`truncate ${!selectedOption && !minimal ? 'text-slate-400 font-normal' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={dropdownClasses}>
          <div className="p-1.5">
            {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                    <div
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        className={`px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors flex justify-between items-center ${
                        isSelected 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                        <span>{opt.label}</span>
                        {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                );
            })}
            {options.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-400 font-medium text-center">Nessuna opzione</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
