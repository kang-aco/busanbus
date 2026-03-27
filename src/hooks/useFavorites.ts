import { useEffect, useState } from "react";
import type { BusRoute } from "@/lib/bus-api/types";

const FAVORITES_KEY = "busanBusFavorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
    setLoading(false);
  }, []);

  const saveFavorites = (newFavorites: BusRoute[]) => {
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  const addFavorite = (route: BusRoute) => {
    if (favorites.some((f) => f.lineId === route.lineId)) return;
    const newFavorites = [route, ...favorites];
    saveFavorites(newFavorites);
  };

  const removeFavorite = (lineId: string) => {
    const newFavorites = favorites.filter((f) => f.lineId !== lineId);
    saveFavorites(newFavorites);
  };

  const isFavorite = (lineId: string) => {
    return favorites.some((f) => f.lineId === lineId);
  };

  const toggleFavorite = (route: BusRoute) => {
    if (isFavorite(route.lineId)) {
      removeFavorite(route.lineId);
    } else {
      addFavorite(route);
    }
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
  };
}
