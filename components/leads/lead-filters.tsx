"use client";

import React from "react";
import { Search, X, Filter } from "lucide-react";

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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs mb-4 space-y-3">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search leads by name, company, phone, location..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => update("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Counter and Clear Filters */}
        <div className="flex items-center gap-3 justify-end text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-semibold">{filteredCount}</strong> of{" "}
            {totalCount} leads
          </span>

          {isFiltered && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Select Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Calling">Calling</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        {/* Interest Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Interest
          </label>
          <select
            value={filters.interest}
            onChange={(e) => update("interest", e.target.value)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Interest</option>
            <option value="Interested">Interested</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Not Ready">Not Ready</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>

        {/* Property Intent Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Intent
          </label>
          <select
            value={filters.intent}
            onChange={(e) => update("intent", e.target.value)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Intent</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
            <option value="RENT">Rent / Lease</option>
            <option value="INVESTMENT">Investment</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>

        {/* Timeline Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Timeline
          </label>
          <select
            value={filters.timeline}
            onChange={(e) => update("timeline", e.target.value)}
            className="w-full py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Timelines</option>
            <option value="Immediate">Immediate</option>
            <option value="Within 3 Months">Within 3 Months</option>
            <option value="3-6 Months">3-6 Months</option>
            <option value="6-12 Months">6-12 Months</option>
            <option value="More Than 12 Months">&gt; 12 Months</option>
            <option value="Just Exploring">Just Exploring</option>
          </select>
        </div>
      </div>
    </div>
  );
}
