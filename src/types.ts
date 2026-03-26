export interface BusRoute {
  lineId: string;
  lineNo: string;
  busType: string;
  companyId: string;
}

export interface BusLocation {
  nodeId: string;
  nodeNm: string;
  nodeNo: string;
  vehId: string;
  carNo: string;
  lowplate: string;
  congestion: string; // 0: 정보없음, 3: 여유, 4: 보통, 5: 혼잡, 6: 매우혼잡
}

export interface BusArrival {
  lineId: string;
  lineNo: string;
  min1: number; // 남은 시간 (분)
  station1: number; // 남은 정류장 수
  lowplate1: string;
  congestion1: string;
}

export interface DirectionStep {
  html_instructions: string;
  distance: { text: string };
  duration: { text: string };
  transit_details?: {
    line: {
      short_name: string;
      vehicle: { name: string; type: string };
    };
    arrival_stop: { name: string };
    departure_stop: { name: string };
    num_stops: number;
  };
}
