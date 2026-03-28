import { Search, MapPin, Loader2 } from "lucide-react";
import { useState } from "react";

interface Stop {
  stopId: string;
  stopName: string;
  arsno: string;
  gpsX: string;
  gpsY: string;
}

interface StopSearchPanelProps {
  onStopSelect: (stopId: string, stopName: string) => void;
}

export default function StopSearchPanel({ onStopSelect }: StopSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/bus/stops?stopName=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setStops([]);
      } else {
        setStops(data.stops || []);
        if (!data.stops || data.stops.length === 0) {
          setError("검색 결과가 없습니다.");
        }
      }
    } catch (err: any) {
      setError("검색 실패: " + err.message);
      setStops([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="정류소 이름 검색 (예: 부산역)"
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

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 검색 결과 */}
      {stops.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {stops.length}개의 정류소를 찾았습니다
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stops.map((stop) => (
              <button
                key={stop.stopId}
                onClick={() => onStopSelect(stop.stopId, stop.stopName)}
                className="w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{stop.stopName}</p>
                    <p className="text-sm text-gray-500">
                      정류소 번호: {stop.arsno || stop.stopId}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}