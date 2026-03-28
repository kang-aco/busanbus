import { Search, Loader2 } from "lucide-react";
import { useState } from "react";

interface Route {
  lineId: string;
  lineNo: string;
  busType: string;
  companyId: string;
}

interface BusSearchPanelProps {
  onSearch: (lineNo: string) => void;
  onRouteSelect: (route: Route) => void;
  routes: Route[];
  loading: boolean;
  error: string | null;
}

export default function BusSearchPanel({
  onSearch,
  onRouteSelect,
  routes,
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

    // 최근 검색어 저장
    const updated = [
      searchQuery.trim(),
      ...recentSearches.filter((s) => s !== searchQuery.trim()),
    ].slice(0, 5);
    setRecentSearches(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("recentBusSearches", JSON.stringify(updated));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
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
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-xl font-bold">버스 노선 검색</h2>

      {/* 검색 입력 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="버스 번호 입력 (예: 179)"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              검색중
            </>
          ) : (
            "검색"
          )}
        </button>
      </div>

      {/* 최근 검색 */}
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">최근 검색</p>
            <button
              onClick={clearRecentSearches}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              전체 삭제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleRecentSearchClick(search)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}