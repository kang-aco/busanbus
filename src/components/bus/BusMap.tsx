"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import type { BusLocation } from "@/lib/bus-api/types";

const BUSAN_CENTER = { lat: 35.1796, lng: 129.0756 };

const mapContainerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "1rem",
};

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6e7681" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#21262d" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6e7681" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#388bfd" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#21262d" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#161b22" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#30363d" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#21262d" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#c9d1d9" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#388bfd" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#388bfd" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: darkMapStyles,
};

// Inner component: only rendered once apiKey is available → useLoadScript called exactly once
function BusMapInner({ apiKey, locations }: { apiKey: string; locations: BusLocation[] }) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey });

  const validLocations = useMemo(
    () =>
      locations.filter(
        (loc) =>
          loc.gpsY && loc.gpsX && !isNaN(parseFloat(loc.gpsY)) && !isNaN(parseFloat(loc.gpsX))
      ),
    [locations]
  );

  const center = useMemo(
    () =>
      validLocations.length > 0
        ? { lat: parseFloat(validLocations[0].gpsY!), lng: parseFloat(validLocations[0].gpsX!) }
        : BUSAN_CENTER,
    [validLocations]
  );

  if (loadError) {
    return (
      <div className="glass-card p-4 border border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">지도를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-3 text-slate-500">
        <MapPin className="w-8 h-8 animate-pulse" />
        <p className="text-sm">지도 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-3">
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
              color: "#00ff88",
              fontSize: "11px",
              fontWeight: "bold",
            }}
            title={`${bus.lineNo || "버스"} - ${bus.nodeNm || "위치 정보 없음"}`}
          />
        ))}
      </GoogleMap>
      {validLocations.length === 0 && (
        <p className="mt-2 text-center text-xs text-slate-500">
          표시할 버스 위치가 없습니다.
        </p>
      )}
    </div>
  );
}

export default function BusMap({ locations }: { locations: BusLocation[] }) {
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
      .catch(() => setKeyError("지도를 불러오는 중 오류가 발생했습니다."));
  }, []);

  if (keyError) {
    return (
      <div className="glass-card p-4 border border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">{keyError}</p>
      </div>
    );
  }

  if (!mapsApiKey) {
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-3 text-slate-500">
        <MapPin className="w-8 h-8 animate-pulse" />
        <p className="text-sm">지도 로딩 중...</p>
      </div>
    );
  }

  return <BusMapInner apiKey={mapsApiKey} locations={locations} />;
}
