export type PublicApiHeader = {
  resultCode?: string | number;
  resultMsg?: string;
  returnReasonCode?: string | number;
  returnAuthMsg?: string;
};

export type BusRoute = {
  lineId: string;
  lineNo: string;
  busType?: string;
  companyId?: string;
};

export type BusLocation = {
  vehId: string;
  lineId: string;
  lineNo?: string;
  nodeId?: string;
  nodeNm?: string;
  gpsX?: string;
  gpsY?: string;
  lowPlate?: string;
  plateNo?: string;
  stopSeq?: string;
};

export type BusArrival = {
  lineId?: string;
  lineNo: string;
  station1?: string;
  station2?: string;
  min1: string;
  min2?: string;
  stopId?: string;
  direction?: string;      // 해석된 방면명 (예: "해운대 방면")
  terminalStart?: string;  // 노선 기점 이름
  terminalEnd?: string;    // 노선 종점 이름
};

export type NormalizedApiError = {
  error: string;
  code?: string;
  message?: string;
  details?: unknown;
};
