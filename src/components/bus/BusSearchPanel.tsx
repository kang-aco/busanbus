"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export function BusSearchPanel({
  searchQuery,
  setSearchQuery,
  onSearch,
  loading,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (forcedQuery?: string) => void;
  loading: boolean;
}) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem("recentBusSearches") || "[]");
    setRecentSearches(recent);
  }, [loading]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    onSearch(q);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem("recentBusSearches");
    setRecentSearches([]);
  };

  return (
    <div className="space-y-3 rounded-3xl border bg-white p-4 shadow-sm">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
              }
            }}
            placeholder="버스 번호를 입력하세요 (예: 1002)"
            className="w-full rounded-2xl border px-4 py-3 pr-10 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
            aria-label="버스 번호 검색"
            disabled={loading}
          />
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={() => onSearch()}
          disabled={loading || !searchQuery.trim()}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          aria-label="검색하기"
        >
          {loading ? "검색중" : "검색"}
        </button>
      </div>

      {recentSearches.length > 0 && (
        <div className="border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">최근 검색</span>
            <button
              onClick={clearRecentSearches}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition"
              aria-label="최근 검색 기록 삭제"
            >
              <X className="h-3 w-3" />
              전체 삭제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s, idx) => (
              <button
                key={`${s}-${idx}`}
                onClick={() => handleSearch(s)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 transition"
                aria-label={`${s}번 버스 검색`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}