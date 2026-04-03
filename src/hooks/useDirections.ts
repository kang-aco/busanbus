import { useState } from "react";
import { stripHtml } from "@/lib/utils";

export type TransportMode = "transit" | "driving" | "bicycling" | "walking";

export interface DirectionsResult {
  status: string;
  routes: GoogleRoute[];
  error?: string;
}

interface GoogleRoute {
  summary: string;
  legs: RouteLeg[];
  warnings: string[];
}

interface RouteLeg {
  duration: { text: string; value: number };
  distance: { text: string; value: number };
  start_address: string;
  end_address: string;
  steps: RouteStep[];
}

interface RouteStep {
  html_instructions: string;
  duration: { text: string; value: number };
  distance: { text: string; value: number };
  travel_mode: string;
  transit_details?: {
    line: {
      name: string;
      short_name: string;
      color?: string;
      vehicle: { type: string; name: string };
    };
    num_stops: number;
    departure_stop: { name: string };
    arrival_stop: { name: string };
    departure_time: { text: string };
    arrival_time: { text: string };
  };
}

export interface ParsedRoute {
  duration: string;
  distance: string;
  steps: ParsedStep[];
}

export interface ParsedStep {
  instruction: string;
  duration: string;
  distance: string;
  mode: string;
  transitLine?: string;
  numStops?: number;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
  arrivalTime?: string;
}


export function useDirections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedRoute | null>(null);

  const search = async (
    origin: string,
    destination: string,
    mode: TransportMode
  ) => {
    if (!origin.trim() || !destination.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({ origin, destination, mode });
      const res = await fetch(`/api/directions?${params}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || data.details || "경로를 찾을 수 없습니다.");
        return;
      }

      if (data.status !== "OK" || !data.routes?.length) {
        setError("해당 경로를 찾을 수 없습니다. 출발지와 도착지를 확인해 주세요.");
        return;
      }

      const route: GoogleRoute = data.routes[0];
      const leg: RouteLeg = route.legs[0];

      const parsedSteps: ParsedStep[] = leg.steps.map((step: RouteStep) => ({
        instruction: stripHtml(step.html_instructions),
        duration: step.duration.text,
        distance: step.distance.text,
        mode: step.travel_mode,
        transitLine: step.transit_details?.line?.short_name || step.transit_details?.line?.name,
        numStops: step.transit_details?.num_stops,
        departureStop: step.transit_details?.departure_stop?.name,
        arrivalStop: step.transit_details?.arrival_stop?.name,
        departureTime: step.transit_details?.departure_time?.text,
        arrivalTime: step.transit_details?.arrival_time?.text,
      }));

      setResult({
        duration: leg.duration.text,
        distance: leg.distance.text,
        steps: parsedSteps,
      });
    } catch (err) {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { loading, error, result, search, reset };
}
