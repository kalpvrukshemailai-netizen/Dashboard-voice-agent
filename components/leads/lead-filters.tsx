"use client";

import React from "react";
import { Search, X, Filter, RotateCcw } from "lucide-react";

export interface FilterState {
  search: string;
  status: string;
  interest: string;
  intent: string;
  timeline: string;
}

interface LeadFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

export function LeadFilters({
  filters,
  onChange,
  onClear,
  totalCount,
  filteredCount,
}: LeadFiltersProps) {
  const isFiltered =
    Boolean(filters.search) ||
    filters.status !== "All" ||
    filters.interest !== "All" ||
    filters.intent !== "All" ||
    filters.timeline !== "All";

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search by prospect name, phone, unit or notes..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => update("search", "")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Counter & Reset Action */}
        <div className="flex items-center gap-3 justify-end text-xs text-slate-500">
          <span className="tabular-nums">
            Showing <strong className="text-slate-900 font-semibold">{filteredCount}</strong> of{" "}
            {totalCount} leads
          </span>

          {isFiltered && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Select Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Pipeline Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          >
            <option value="All">All Statuses</option>
            <option value="NEW">New</option>
            <option value="QUEUED">Queued</option>
            <option value="CALLING">Calling</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="RETRY_SCHEDULED">Retry Scheduled</option>
            <option value="DISQUALIFIED">Disqualified</option>
            <option value="DO_NOT_CALL">Do Not Call (DND)</option>
          </select>
        </div>

        {/* Interest Filter */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Qualification
          </label>
          <select
            value={filters.interest}
            onChange={(e) => update("interest", e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          >
            <option value="All">All Outcomes</option>
            <option value="QUALIFIED">Qualified / Site Visit</option>
            <option value="NOT_INTERESTED">Not Interested</option>
            <option value="PENDING">Pending Evaluation</option>
          </select>
        </div>

        {/* Property Intent Filter */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Project / Configuration
          </label>
          <select
            value={filters.intent}
            onChange={(e) => update("intent", e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          >
            <option value="All">All Projects</option>
            <option value="SOLITAIRE">HSK Solitaire (3 BHK)</option>
            <option value="PARK_VIEW">HSK Park View (2 & 3 BHK)</option>
            <option value="COMMERCIAL">HSK Commercial Hub</option>
          </select>
        </div>

        {/* Timeline Filter */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Timeline
          </label>
          <select
            value={filters.timeline}
            onChange={(e) => update("timeline", e.target.value)}
            className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          >
            <option value="All">All Timelines</option>
            <option value="Immediate">Immediate (&lt;30 days)</option>
            <option value="1-3 Months">1 – 3 Months</option>
            <option value="3-6 Months">3 – 6 Months</option>
            <option value="Exploring">Exploring / Long Term</option>
          </select>
        </div>
      </div>
    </div>
  );
}
