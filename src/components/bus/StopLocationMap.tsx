"use client";

import { useEffect, useState } from "react";
import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";
import { MapPin, Footprints, ExternalLink } from "lucide-react";

const containerStyle = { width: "100%", height: "240px", borderRadius: "0.75rem" };

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

  // 도보 길안내 URL — 한국 지도가 상세한 네이버·카카오로 연결
  const enc = encodeURIComponent;
  const naverWalk = hasUser
    ? `https://map.naver.com/p/directions/${userLng},${userLat},${enc("내 위치")},,/${stopLng},${stopLat},${enc(stopName)},,/-/walk`
    : `https://map.naver.com/p/search/${enc(stopName)}`;
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
    if (hasUser) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: stopLat, lng: stopLng });
      bounds.extend({ lat: userLat as number, lng: userLng as number });
      map.fitBounds(bounds, 70);
      // 정류소가 매우 가까우면 과확대되어 주변이 안 보이므로 줌 상한을 둔다
      google.maps.event.addListenerOnce(map, "idle", () => {
        const z = map.getZoom() ?? 17;
        if (z > 17) map.setZoom(17);
      });
    } else {
      map.setCenter({ lat: stopLat, lng: stopLng });
      map.setZoom(17);
    }
  };

  return (
    <div className="glass-card p-3 flex flex-col gap-3">
      <GoogleMap
        mapContainerStyle={containerStyle}
        onLoad={onLoad}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
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

      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-slate-500 px-0.5 flex items-center gap-1">
          <Footprints className="w-3 h-3" />
          정류소까지 도보 길안내
          {typeof dist === "number" && (
            <span className="font-semibold text-slate-700">
              · {dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <a
            href={naverWalk}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#03C75A] text-white hover:bg-[#02B350] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            네이버 지도 도보
          </a>
          <a
            href={kakaoWalk}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#FEE500] text-[#3A1D1D] hover:bg-[#FFD700] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            카카오맵
          </a>
        </div>
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
