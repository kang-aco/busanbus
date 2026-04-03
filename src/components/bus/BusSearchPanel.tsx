"use client";

import { Search, Loader2, Clock, X } from "lucide-react";
import React, { useState } from "react";
import type { BusRoute } from "@/lib/bus-api/types";

interface BusSearchPanelProps {
  onSearch: (lineNo: string) => void;
  onRouteSelect: (route: BusRoute) => void;
  routes: BusRoute[];
  loading: boolean;
  error: string | null;
}

export default function BusSearchPanel({
  onSearch,
  loading,
  error,
}: BusSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recentBusSearches");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    onSearch(searchQuery.trim());
    const updated = [
      searchQuery.trim(),
      ...recentSearches.filter((s) => s !== searchQuery.trim()),
    ].slice(0, 5);
    setRecentSearches(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("recentBusSearches", JSON.stringify(updated));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleRecentSearchClick = (search: string) => {
    setSearchQuery(search);
    onSearch(search);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("recentBusSearches");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="버스 번호 입력 (예: 179, 1003)"
            className="glass-input w-full pl-10 pr-4 py-3 text-sm"
            aria-label="버스 번호 검색"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="btn-primary px-4 py-3 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="검색"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="text-sm hidden sm:inline">
            {loading ? "검색중" : "검색"}
          </span>
        </button>
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>최근 검색</span>
            </div>
            <button
              onClick={clearRecentSearches}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              <X className="w-3 h-3" />
              전체 삭제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, idx) => (
              <button
                key={idx}
                onClick={() => handleRecentSearchClick(search)}
                className="px-3 py-1 text-xs rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
