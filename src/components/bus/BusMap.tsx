"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import type { BusLocation } from "@/lib/bus-api/types";
import type { RouteStop } from "@/hooks/useBusRouteStops";

const BUSAN_CENTER = { lat: 35.1796, lng: 129.0756 };

const mapContainerStyle = {
  width: "100%",
  height: "360px",
  borderRadius: "1rem",
};

const lightMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f7fb" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dcfce7" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#16a34a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e5e9f0" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fef3c7" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#fde68a" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#2563eb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c7ddf5" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#2563eb" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: lightMapStyles,
};

// 노선 타입별 색상 (부산 버스 유형 기준)
function getRouteColor(lineId: string): string {
  const colors = ["#2563eb", "#ea580c", "#059669", "#9333ea", "#d97706", "#dc2626", "#0891b2"];
  let hash = 0;
  for (let i = 0; i < lineId.length; i++) {
    hash = lineId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface BusMapInnerProps {
  apiKey: string;
  mapId: string | null;
  locations: BusLocation[];
  routeStops: RouteStop[];
  lineId: string | null;
}

function BusMapInner({ apiKey, mapId, locations, routeStops, lineId }: BusMapInnerProps) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey });

  const validLocations = useMemo(
    () =>
      locations.filter(
        (loc) =>
          loc.gpsY && loc.gpsX && !isNaN(parseFloat(loc.gpsY)) && !isNaN(parseFloat(loc.gpsX))
      ),
    [locations]
  );

  const routeColor = useMemo(() => (lineId ? getRouteColor(lineId) : "#2563eb"), [lineId]);

  // busInfoByRouteId 는 버스가 있는 정류소에만 좌표를 제공하므로 좌표 있는 것만 사용
  const stopsWithCoord = useMemo(
    () =>
      routeStops.filter(
        (s): s is typeof s & { lat: number; lng: number } =>
          typeof s.lat === "number" && typeof s.lng === "number"
      ),
    [routeStops]
  );

  const routePath = useMemo(
    () => stopsWithCoord.map((s) => ({ lat: s.lat, lng: s.lng })),
    [stopsWithCoord]
  );

  // 지도 중심: 버스 위치 > 좌표 있는 정류장 > 부산 중심
  const center = useMemo(() => {
    if (validLocations.length > 0) {
      return { lat: parseFloat(validLocations[0].gpsY!), lng: parseFloat(validLocations[0].gpsX!) };
    }
    if (stopsWithCoord.length > 0) {
      const mid = stopsWithCoord[Math.floor(stopsWithCoord.length / 2)];
      return { lat: mid.lat, lng: mid.lng };
    }
    return BUSAN_CENTER;
  }, [validLocations, stopsWithCoord]);

  // 노선 전체가 보이도록 줌 계산
  const zoom = useMemo(() => {
    if (stopsWithCoord.length > 1) return 13;
    if (validLocations.length > 0) return 14;
    return 12;
  }, [stopsWithCoord.length, validLocations.length]);

  if (loadError) {
    return (
      <div className="glass-card p-4 border border-red-200 bg-red-50">
        <p className="text-sm text-red-600">지도를 불러오는 중 오류가 발생했습니다.</p>
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

  const firstStop = routeStops[0];
  const lastStop = routeStops[routeStops.length - 1];
  // 지도 마커는 좌표가 있는 정류소로 (실제 기·종점은 좌표가 없을 수 있음)
  const mapFirst = stopsWithCoord[0];
  const mapLast = stopsWithCoord[stopsWithCoord.length - 1];

  return (
    <div className="glass-card p-3 flex flex-col gap-2">
      {/* 노선 색상 범례 */}
      {routeStops.length > 0 && (
        <div className="flex items-center gap-3 px-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#10b981", background: "#10b981" }} />
            <span>운행 중 버스</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-1 rounded-full" style={{ background: routeColor }} />
            <span>노선 경로</span>
          </div>
          {firstStop && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="truncate max-w-[5rem]">{firstStop.name}</span>
            </div>
          )}
          {lastStop && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="truncate max-w-[5rem]">{lastStop.name}</span>
            </div>
          )}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={zoom}
        center={center}
        options={{ ...mapOptions, ...(mapId ? { mapId } : {}) }}
      >
        {/* 노선 경로 Polyline */}
        {routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: routeColor,
              strokeOpacity: 0.85,
              strokeWeight: 5,
              zIndex: 1,
            }}
          />
        )}

        {/* 좌표가 있는 양 끝 정류소 마커 */}
        {mapFirst && (
          <Marker
            position={{ lat: mapFirst.lat, lng: mapFirst.lng }}
            title={mapFirst.name}
            label={{ text: "출", color: "#fff", fontSize: "10px", fontWeight: "bold" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#10b981",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
            zIndex={3}
          />
        )}
        {mapLast && mapLast.nodeId !== mapFirst?.nodeId && (
          <Marker
            position={{ lat: mapLast.lat, lng: mapLast.lng }}
            title={mapLast.name}
            label={{ text: "종", color: "#fff", fontSize: "10px", fontWeight: "bold" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#f43f5e",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
            zIndex={3}
          />
        )}

        {/* 운행 중 버스 마커 */}
        {validLocations.map((bus) => (
          <Marker
            key={bus.vehId}
            position={{ lat: parseFloat(bus.gpsY!), lng: parseFloat(bus.gpsX!) }}
            title={`${bus.lineNo || "버스"} — ${bus.nodeNm || ""}`}
            label={{ text: "🚌", fontSize: "16px" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#10b981",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
            zIndex={5}
          />
        ))}
      </GoogleMap>

      {validLocations.length === 0 && routeStops.length === 0 && (
        <p className="text-center text-xs text-slate-500">표시할 정보가 없습니다.</p>
      )}
    </div>
  );
}

export default function BusMap({
  locations,
  routeStops = [],
  lineId = null,
}: {
  locations: BusLocation[];
  routeStops?: RouteStop[];
  lineId?: string | null;
}) {
  const [mapsApiKey, setMapsApiKey] = useState<string>("");
  const [mapsMapId, setMapsMapId] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/maps-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.key) {
          setMapsApiKey(data.key);
          setMapsMapId(data.mapId ?? null);
        } else {
          setKeyError(data.error || "Google Maps API 키를 가져올 수 없습니다.");
        }
      })
      .catch(() => setKeyError("지도를 불러오는 중 오류가 발생했습니다."));
  }, []);

  if (keyError) {
    return (
      <div className="glass-card p-4 border border-red-200 bg-red-50">
        <p className="text-sm text-red-600">{keyError}</p>
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

  return (
    <BusMapInner
      apiKey={mapsApiKey}
      mapId={mapsMapId}
      locations={locations}
      routeStops={routeStops}
      lineId={lineId}
    />
  );
}
