"use client";

import { useState } from "react";
import type { BusRoute } from "@/lib/bus-api/types";

export function useBusSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const saveRecentSearch = (query: string) => {
    try {
      const recent = JSON.parse(localStorage.getItem("recentBusSearches") || "[]");
      const updated = [query, ...recent.filter((q: string) => q !== query)].slice(0, 10);
      localStorage.setItem("recentBusSearches", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent search", e);
    }
  };

  const searchBus = async (forcedQuery?: string) => {
    const query = (forcedQuery ?? searchQuery).trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/bus/route-list?lineNo=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "노선 검색 실패");
      }

      const list = Array.isArray(data?.routes) ? data.routes : [];

      setRoutes(list);

      if (list.length === 0) {
        setSearchError("검색 결과가 없습니다.");
      } else {
        saveRecentSearch(query);
      }
    } catch (err: any) {
      console.error("[Search Error]:", err);
      setRoutes([]);
      setSearchError(err?.message || "검색 중 오류가 발생했습니다.");
    } finally {
      setSearchLoading(false);
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    routes,
    searchLoading,
    searchError,
    searchBus,
  };
}