"use client";

import type { BusArrival } from "@/lib/bus-api/types";

export function ArrivalPanel({ arrivals }: { arrivals: BusArrival[] }) {
  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">정류소 도착 정보</h2>

      <div className="space-y-3">
        {arrivals.length === 0 ? (
          <p className="text-sm text-gray-500">도착 예정 정보가 없습니다.</p>
        ) : (
          arrivals.map((item, idx) => (
            <div key={`${item.lineNo}-${item.station1}-${idx}`} className="rounded-2xl border bg-gray-50 p-3">
              <p className="font-semibold">{item.lineNo}번</p>
              <p className="text-sm text-gray-600">첫 번째 도착: {item.min1 || "정보 없음"}분</p>
              <p className="text-sm text-gray-600">두 번째 도착: {item.min2 || "정보 없음"}분</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}