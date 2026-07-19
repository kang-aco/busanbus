export interface StopLike {
  stopId: string;
  stopName: string;
  gpsX: string;
  gpsY: string;
}

/** 두 정류소 간 거리(m) — gpsY=위도, gpsX=경도 */
export function distMeters(a: StopLike, b: StopLike): number {
  const lat1 = parseFloat(a.gpsY), lng1 = parseFloat(a.gpsX);
  const lat2 = parseFloat(b.gpsY), lng2 = parseFloat(b.gpsX);
  if ([lat1, lng1, lat2, lng2].some(isNaN)) return Infinity;
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 이름을 토큰으로 분해 (2글자 이상) */
function nameTokens(name: string): string[] {
  return (name || "")
    .split(/[.\s,·()]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** 두 정류소 이름이 같은 토큰을 공유하는지 (같은 위치의 반대·인접 폴 판별용) */
function shareNameToken(a: StopLike, b: StopLike): boolean {
  const ta = new Set(nameTokens(a.stopName));
  return nameTokens(b.stopName).some((t) => ta.has(t));
}

/** 선택한 정류소와 같은 위치로 볼 수 있는 인접 폴들의 id */
export function nearbyStopIds(selected: StopLike, all: StopLike[]): string[] {
  return all
    .filter((s) => s.stopId !== selected.stopId)
    .map((s) => ({ s, d: distMeters(selected, s) }))
    // 아주 가깝거나(≤120m), 이름 토큰을 공유하며 300m 이내면 같은 정류소로 간주
    .filter(({ s, d }) => d <= 120 || (d <= 300 && shareNameToken(selected, s)))
    .sort((x, y) => x.d - y.d)
    .slice(0, 8)
    .map(({ s }) => s.stopId);
}
