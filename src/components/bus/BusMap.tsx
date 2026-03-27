"use client";

import { useEffect, useState } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import type { BusLocation } from "@/lib/bus-api/types";

const BUSAN_CENTER = { lat: 35.1796, lng: 129.0756 }; // 부산시청

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "1.5rem",
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

export function BusMap({ locations }: { locations: BusLocation[] }) {
  const [mapsApiKey, setMapsApiKey] = useState<string>("");
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/maps-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.key) {
          setMapsApiKey(data.key);
        } else {
          setKeyError(data.error || "Google Maps API 키를 가져올 수 없습니다.");
        }
      })
      .catch((err) => {
        console.error("[Maps Key Error]:", err);
        setKeyError("Google Maps API 키를 가져오는 중 오류가 발생했습니다.");
      });
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: mapsApiKey,
  });

  if (keyError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{keyError}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          지도를 불러오는 중 오류가 발생했습니다.
        </p>
      </div>
    );
  }

  if (!isLoaded || !mapsApiKey) {
    return (
      <div className="rounded-3xl border bg-gray-50 p-4">
        <p className="text-center text-sm text-gray-500">지도 로딩 중...</p>
      </div>
    );
  }

  const validLocations = locations.filter(
    (loc) => loc.gpsY && loc.gpsX && !isNaN(parseFloat(loc.gpsY)) && !isNaN(parseFloat(loc.gpsX))
  );

  const center =
    validLocations.length > 0
      ? {
          lat: parseFloat(validLocations[0].gpsY!),
          lng: parseFloat(validLocations[0].gpsX!),
        }
      : BUSAN_CENTER;

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">버스 위치 지도</h2>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={validLocations.length > 0 ? 14 : 12}
        center={center}
        options={mapOptions}
      >
        {validLocations.map((bus) => (
          <Marker
            key={bus.vehId}
            position={{
              lat: parseFloat(bus.gpsY!),
              lng: parseFloat(bus.gpsX!),
            }}
            label={{
              text: bus.lineNo || "🚌",
              color: "white",
              fontSize: "12px",
              fontWeight: "bold",
            }}
            title={`${bus.lineNo || "버스"} - ${bus.nodeNm || "위치 정보 없음"}`}
          />
        ))}
      </GoogleMap>
      {validLocations.length === 0 && (
        <p className="mt-2 text-center text-sm text-gray-500">
          표시할 버스 위치가 없습니다.
        </p>
      )}
    </div>
  );
}