import React from 'react';
import { Calendar, Filter } from 'lucide-react';

interface DateFiltersProps {
  years: number[];
  selectedYear: number | 'ALL';
  selectedMonth: number | 'ALL';
  onYearChange: (year: number | 'ALL') => void;
  onMonthChange: (month: number | 'ALL') => void;
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export const DateFilters: React.FC<DateFiltersProps> = ({
  years,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center mb-6">
      <div className="flex items-center gap-2 text-slate-500 font-medium mr-2">
        <Filter size={20} />
        <span>Filtri Data</span>
      </div>

      <div className="flex gap-4 w-full sm:w-auto">
        {/* Year Selector */}
        <div className="relative flex-1 sm:flex-none">
          <select
            value={selectedYear}
            onChange={(e) => {
              const val = e.target.value;
              onYearChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
            }}
            className="w-full sm:w-40 appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Tutti gli anni</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <Calendar size={16} />
          </div>
        </div>

        {/* Month Selector */}
        <div className="relative flex-1 sm:flex-none">
          <select
            value={selectedMonth}
            onChange={(e) => {
              const val = e.target.value;
              onMonthChange(val === 'ALL' ? 'ALL' : parseInt(val, 10));
            }}
            className="w-full sm:w-48 appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Tutti i mesi</option>
            {MONTHS.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
