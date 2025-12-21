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
  searchable?: boolean; // Enable search input inside dropdown
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Seleziona...", 
  disabled = false,
  className = "",
  minimal = false,
  anchor = 'left',
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Reset search on close
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
        // Small timeout to allow render
        setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
        setSearchTerm('');
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const handleSelect = (val: string | number) => {
    if (!disabled) {
      onChange(val);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const filteredOptions = searchable 
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  // Base styles
  const containerBase = minimal 
    ? `relative inline-block` 
    : `relative w-full ${className}`;

  const triggerBase = minimal
    ? `flex items-center space-x-2 font-bold text-slate-900 cursor-pointer outline-none transition-opacity ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-70'}`
    : `w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none flex justify-between items-center transition-all ${isOpen ? 'ring-4 ring-blue-50 border-blue-500' : 'hover:bg-slate-100'} ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer bg-slate-50'}`;

  // Dropdown positioning
  const dropdownClasses = `absolute z-[100] mt-2 min-w-[180px] bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col ${anchor === 'right' ? 'right-0' : 'left-0'} ${!minimal ? 'w-full' : ''}`;

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
        <div className={dropdownClasses} style={{ maxHeight: '300px' }}>
          
          {/* Search Input (Sticky Header) */}
          {searchable && (
              <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                        placeholder="Cerca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                  </div>
              </div>
          )}

          <div className="p-1.5 overflow-y-auto custom-scrollbar flex-1">
            {filteredOptions.map((opt) => {
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
            {filteredOptions.length === 0 && (
                <div className="px-4 py-6 text-xs text-slate-400 font-medium text-center">
                    Nessun risultato
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};