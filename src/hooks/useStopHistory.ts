import { useCallback, useEffect, useState } from "react";

/** 최근 검색/즐겨찾기에 저장하는 정류소 정보 */
export interface SavedStop {
  stopId: string;
  stopName: string;
  arsno: string;
  /** 같은 위치의 인접 폴 id — 도착정보 조회 시 함께 사용 */
  nearbyIds: string[];
  savedAt: number;
}

const RECENT_KEY = "recentStopSearches";
const FAVORITE_KEY = "favoriteStops";
const MAX_RECENT = 10;

function load(key: string): SavedStop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 형태가 깨진 항목은 걸러내고, 빠진 필드는 기본값으로 채움
    return parsed
      .filter((s: any) => s && typeof s.stopId === "string")
      .map((s: any) => ({
        stopId: s.stopId,
        stopName: typeof s.stopName === "string" ? s.stopName : "",
        arsno: typeof s.arsno === "string" ? s.arsno : "",
        nearbyIds: Array.isArray(s.nearbyIds)
          ? s.nearbyIds.filter((id: any) => typeof id === "string")
          : [],
        savedAt: typeof s.savedAt === "number" ? s.savedAt : 0,
      }));
  } catch {
    return [];
  }
}

function save(key: string, stops: SavedStop[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(stops));
  } catch {
    /* 저장 공간 부족 등은 무시 — 목록은 메모리 상태로 유지 */
  }
}

/** 정류소 최근 검색 & 즐겨찾기 (localStorage 기반, 서버 불필요) */
export function useStopHistory() {
  const [recent, setRecent] = useState<SavedStop[]>([]);
  const [favorites, setFavorites] = useState<SavedStop[]>([]);

  useEffect(() => {
    setRecent(load(RECENT_KEY));
    setFavorites(load(FAVORITE_KEY));
  }, []);

  /** 조회한 정류소를 최근 검색 맨 앞에 추가 (중복은 앞으로 이동, 최대 10개) */
  const addRecent = useCallback((stop: Omit<SavedStop, "savedAt">) => {
    setRecent((prev) => {
      const entry: SavedStop = { ...stop, savedAt: Date.now() };
      const next = [entry, ...prev.filter((s) => s.stopId !== stop.stopId)].slice(0, MAX_RECENT);
      save(RECENT_KEY, next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((stopId: string) => {
    setRecent((prev) => {
      const next = prev.filter((s) => s.stopId !== stopId);
      save(RECENT_KEY, next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    save(RECENT_KEY, []);
  }, []);

  /** 별표 토글 — 이미 있으면 해제, 없으면 추가 */
  const toggleFavorite = useCallback((stop: Omit<SavedStop, "savedAt">) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.stopId === stop.stopId);
      const next = exists
        ? prev.filter((s) => s.stopId !== stop.stopId)
        : [...prev, { ...stop, savedAt: Date.now() }];
      save(FAVORITE_KEY, next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((stopId: string) => {
    setFavorites((prev) => {
      const next = prev.filter((s) => s.stopId !== stopId);
      save(FAVORITE_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (stopId: string) => favorites.some((s) => s.stopId === stopId),
    [favorites]
  );

  return {
    recent,
    favorites,
    addRecent,
    removeRecent,
    clearRecent,
    toggleFavorite,
    removeFavorite,
    isFavorite,
  };
}
