"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="space-y-3 rounded-3xl border bg-white p-4 shadow-sm">
      <div className="flex gap-2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="버스 번호를 입력하세요"
          className="flex-1 rounded-2xl border px-4 py-3 outline-none"
        />
        <button
          onClick={() => onSearch()}
          disabled={loading}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
        >
          {loading ? "검색중" : "검색"}
        </button>
      </div>

      {recentSearches.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-xs text-gray-400 w-full mb-1">최근 검색</span>
          {recentSearches.map((s) => (
            <button
              key={s}
              onClick={() => handleSearch(s)}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 hover:bg-gray-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}