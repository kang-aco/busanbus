import { BusArrival, BusLocation, BusRoute } from "./types";

export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export function normalizeRoutes(data: any): BusRoute[] {
  const raw = toArray(data?.response?.body?.items?.item ?? data?.body?.items?.item);

  return raw.map((item: any) => ({
    lineId: String(item.lineId || item.lineid || item.lineNm || ""),
    lineNo: String(item.lineNo || item.lineno || item.busno || item.lineNm || ""),
    busType: String(item.busType || item.bustype || item.routetp || ""),
    companyId: String(item.companyId || item.companyid || ""),
  }));
}

export function normalizeLocations(data: any): BusLocation[] {
  const raw = toArray(data?.response?.body?.items?.item ?? data?.body?.items?.item);

  return raw.map((item: any) => {
    const nodeId = String(item.nodeId || item.nodeid || "");
    const plateNo = String(item.plateNo || item.carNo || item.carno || "");
    const lineId = String(item.lineId || item.lineid || "");

    return {
      vehId: String(item.vehId || item.vehid || `${lineId}-${nodeId}-${plateNo || "bus"}`),
      lineId,
      lineNo: String(item.lineNo || item.lineno || ""),
      nodeId,
      nodeNm: String(item.nodeNm || item.nodenm || ""),
      gpsX: String(item.gpsX || item.gpsx || item.posX || ""),
      gpsY: String(item.gpsY || item.gpsy || item.posY || ""),
      lowPlate: String(item.lowPlate || item.lowplate || ""),
      plateNo,
      stopSeq: String(item.stopSeq || item.stopseq || ""),
    };
  });
}

export function normalizeArrivals(data: any): BusArrival[] {
  const raw = toArray(data?.response?.body?.items?.item ?? data?.body?.items?.item);

  return raw.map((item: any) => ({
    lineId: String(item.lineId || item.lineid || ""),
    lineNo: String(item.lineNo || item.lineno || item.busNo || ""),
    station1: String(item.station1 || item.stationNm1 || ""),
    station2: String(item.station2 || item.stationNm2 || ""),
    min1: String(item.min1 || item.arrtime1 || ""),
    min2: String(item.min2 || item.arrtime2 || ""),
    stopId: String(item.stopId || item.nodeId || item.arsNo || ""),
  }));
}