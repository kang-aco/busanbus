import { useState, useEffect } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("favoriteBusRoutes");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    }
  }, []);

  const toggleFavorite = (lineId: string) => {
    const updated = favorites.includes(lineId)
      ? favorites.filter((id) => id !== lineId)
      : [...favorites, lineId];

    setFavorites(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("favoriteBusRoutes", JSON.stringify(updated));
    }
  };

  return { favorites, toggleFavorite };
}