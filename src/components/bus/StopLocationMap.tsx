"use client";

import { useEffect, useState } from "react";
import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";
import { MapPin, Footprints, ExternalLink } from "lucide-react";

const containerStyle = { width: "100%", height: "220px", borderRadius: "0.75rem" };

const lightMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f5f7fb" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dcfce7" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e5e9f0" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#2563eb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c7ddf5" }] },
];

interface Props {
  userLat: number | null;
  userLng: number | null;
  stopLat: number;
  stopLng: number;
  stopName: string;
  dist?: number;
}

function MapInner({
  apiKey,
  mapId,
  userLat,
  userLng,
  stopLat,
  stopLng,
  stopName,
  dist,
}: Props & { apiKey: string; mapId: string | null }) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey });
  const hasUser = typeof userLat === "number" && typeof userLng === "number";

  // 도보 길안내 URL (길찾기 도보안내와 동일하게 외부 지도로 연결)
  const enc = encodeURIComponent;
  const googleWalk = hasUser
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${stopLat},${stopLng}&travelmode=walking`
    : `https://www.google.com/maps/search/?api=1&query=${stopLat},${stopLng}`;
  const kakaoWalk = hasUser
    ? `https://map.kakao.com/link/from/내위치,${userLat},${userLng}/to/${enc(stopName)},${stopLat},${stopLng}`
    : `https://map.kakao.com/link/to/${enc(stopName)},${stopLat},${stopLng}`;

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

  const onLoad = (map: google.maps.Map) => {
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: stopLat, lng: stopLng });
    if (hasUser) bounds.extend({ lat: userLat as number, lng: userLng as number });
    if (hasUser) {
      map.fitBounds(bounds, 64);
    } else {
      map.setCenter({ lat: stopLat, lng: stopLng });
      map.setZoom(16);
    }
  };

  return (
    <div className="glass-card p-3 flex flex-col gap-3">
      <GoogleMap
        mapContainerStyle={containerStyle}
        onLoad={onLoad}
        options={{
          styles: lightMapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          ...(mapId ? { mapId } : {}),
        }}
      >
        {hasUser && (
          <>
            <Polyline
              path={[
                { lat: userLat as number, lng: userLng as number },
                { lat: stopLat, lng: stopLng },
              ]}
              options={{
                strokeColor: "#2563eb",
                strokeOpacity: 0,
                icons: [
                  {
                    icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, scale: 3 },
                    offset: "0",
                    repeat: "12px",
                  },
                ],
              }}
            />
            <Marker
              position={{ lat: userLat as number, lng: userLng as number }}
              title="내 위치"
              label={{ text: "나", color: "#fff", fontSize: "10px", fontWeight: "bold" }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#2563eb",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
            />
          </>
        )}
        <Marker
          position={{ lat: stopLat, lng: stopLng }}
          title={stopName}
          icon={{
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
            scale: 1.6,
            anchor: new google.maps.Point(12, 22),
          }}
        />
      </GoogleMap>

      <div className="flex items-center gap-2">
        <a
          href={googleWalk}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-colors"
        >
          <Footprints className="w-3.5 h-3.5" />
          도보 길안내
          {typeof dist === "number" && <span className="opacity-80">· {dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`}</span>}
        </a>
        <a
          href={kakaoWalk}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#FEE500] text-[#3A1D1D] hover:bg-[#FFD700] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          카카오맵
        </a>
      </div>
    </div>
  );
}

export default function StopLocationMap(props: Props) {
  const [apiKey, setApiKey] = useState<string>("");
  const [mapId, setMapId] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/maps-key")
      .then((r) => r.json())
      .then((d) => {
        if (d.key) {
          setApiKey(d.key);
          setMapId(d.mapId ?? null);
        } else setKeyError(d.error || "Google Maps API 키를 가져올 수 없습니다.");
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
  if (!apiKey) {
    return (
      <div className="glass-card p-8 flex flex-col items-center gap-3 text-slate-500">
        <MapPin className="w-8 h-8 animate-pulse" />
        <p className="text-sm">지도 로딩 중...</p>
      </div>
    );
  }

  return <MapInner {...props} apiKey={apiKey} mapId={mapId} />;
}
