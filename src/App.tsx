/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component } from "react";
import { 
  Search, 
  MapPin, 
  Bus, 
  Navigation, 
  Clock, 
  Info, 
  ArrowRight, 
  RefreshCw,
  ChevronRight,
  TrainFront,
  Users,
  Locate,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { BusRoute, BusLocation, BusArrival, DirectionStep } from "./types";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query } from "firebase/firestore";
import { GoogleMap, LoadScript, DirectionsRenderer } from "@react-google-maps/api";
import { Toaster, toast } from "sonner";

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state: { hasError: boolean; error: any };
  props: { children: React.ReactNode };

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "문제가 발생했습니다. 나중에 다시 시도해 주세요.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error && parsedError.error.includes("Missing or insufficient permissions")) {
          errorMessage = "권한이 없습니다. 로그인 상태를 확인해 주세요.";
        }
      } catch (e) {
        // Not a JSON error
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h2 className="text-2xl font-bold mb-4">앗! 오류가 발생했습니다.</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const CONGESTION_MAP: Record<string, { label: string; color: string }> = {
  "0": { label: "정보없음", color: "text-gray-400" },
  "3": { label: "여유", color: "text-green-500" },
  "4": { label: "보통", color: "text-blue-500" },
  "5": { label: "혼잡", color: "text-orange-500" },
  "6": { label: "매우혼잡", color: "text-red-500" },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      return;
    }
    const q = query(collection(db, "users", user.uid, "favorites"));
    const path = `users/${user.uid}/favorites`;
    return onSnapshot(q, (snapshot) => {
      const favs = new Set<string>();
      snapshot.forEach((doc) => favs.add(doc.id));
      setFavorites(favs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }, [user]);

  const toggleFavorite = async (route: BusRoute) => {
    if (!user) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return;
    }
    const path = `users/${user.uid}/favorites/${route.lineId}`;
    const favRef = doc(db, "users", user.uid, "favorites", route.lineId);
    try {
      if (favorites.has(route.lineId)) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, { userId: user.uid, lineId: route.lineId, lineNo: route.lineNo });
      }
    } catch (error) {
      handleFirestoreError(error, favorites.has(route.lineId) ? OperationType.DELETE : OperationType.WRITE, path);
    }
  };

  const [activeTab, setActiveTab] = useState<"search" | "route" | "info">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [busLocations, setBusLocations] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Route Search States
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [directions, setDirections] = useState<any>(null);
  const [mapsKey, setMapsKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/maps-key")
      .then(res => res.json())
      .then(data => setMapsKey(data.key))
      .catch(console.error);
  }, []);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem("recentBusSearches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentBusSearches", JSON.stringify(updated));
  };

  // Route Search State
  const [arrivals, setArrivals] = useState<BusArrival[]>([]);

  const fetchArrivals = async (stopId: string) => {
    try {
      const res = await fetch(`/api/bus/arrival?stopId=${stopId}`);
      const data = await res.json();
      const header = data?.response?.header;
      
      if (header && header.resultCode !== "00" && header.resultCode !== 0) {
        console.error(`Bus Arrival API Error: ${header.resultMsg}`);
        return;
      }

      const items = data?.response?.body?.items?.item;
      setArrivals(Array.isArray(items) ? items : items ? [items] : []);
    } catch (error) {
      console.error(error);
    }
  };

  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [notifiedStops, setNotifiedStops] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedStop) {
      fetchArrivals(selectedStop);
      const interval = setInterval(() => fetchArrivals(selectedStop), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedStop]);

  useEffect(() => {
    arrivals.forEach(arr => {
      const min = parseInt(arr.min1);
      if (min <= 3 && !notifiedStops.has(arr.lineNo + arr.station1)) {
        toast.info(`${arr.lineNo}번 버스가 ${arr.min1}분 뒤 도착합니다!`);
        setNotifiedStops(prev => new Set(prev).add(arr.lineNo + arr.station1));
      }
    });
  }, [arrivals]);

  const searchBus = async () => {
    if (!searchQuery) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bus/route-list?lineNo=${searchQuery}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "서버 응답 오류", details: "JSON 형식이 아닙니다." }));
        throw new Error(errorData.details || errorData.error || "알 수 없는 오류");
      }

      const data = await res.json();
      const header = data?.response?.header || data?.header || data?.cmmMsgHeader;
      const resultCode = String(header?.resultCode || header?.returnReasonCode || "");
      const resultMsg = String(header?.resultMsg || header?.returnAuthMsg || "");
      
      if (resultCode !== "00" && resultCode !== "0" && resultCode !== "") {
        throw new Error(resultMsg || `API 오류 (코드: ${resultCode})`);
      }

      const body = data?.response?.body || data?.body;
      const items = body?.items?.item;
      const list = Array.isArray(items) ? items : items ? [items] : [];
      setRoutes(list);
      if (list.length === 0) {
        setError("검색 결과가 없습니다.");
      } else {
        saveRecentSearch(searchQuery);
      }
    } catch (err: any) {
      console.error("[Search Error]:", err);
      setError(err.message || "검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusLocations = async (lineId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bus/location?lineId=${lineId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const header = data?.response?.header;
      if (header && header.resultCode !== "00" && header.resultCode !== 0) {
        throw new Error(header.resultMsg || `API 오류 (코드: ${header.resultCode})`);
      }

      const items = data?.response?.body?.items?.item;
      setBusLocations(Array.isArray(items) ? items : items ? [items] : []);
    } catch (err: any) {
      setError(err.message || "위치 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const findPath = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.details || data.error || "경로 검색 중 서버 오류가 발생했습니다.");
      }

      if (data.status === "ZERO_RESULTS") throw new Error("경로를 찾을 수 없습니다. 출발지와 목적지를 정확히 입력해 주세요.");
      if (data.status !== "OK") throw new Error(data.error_message || "Google Maps API 오류: " + data.status);
      
      setDirections(data);
    } catch (err: any) {
      setError(err.message || "경로 검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("현재 위치를 사용할 수 없습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin(`${position.coords.latitude},${position.coords.longitude}`);
      },
      () => {
        setError("현재 위치를 가져오는데 실패했습니다.");
      }
    );
  };

  useEffect(() => {
    if (selectedRoute) {
      fetchBusLocations(selectedRoute.lineId);
      const interval = setInterval(() => fetchBusLocations(selectedRoute.lineId), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedRoute]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans dark:bg-gray-900 dark:text-white">
      <Toaster position="top-center" />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bus className="text-blue-600" />
            부산 버스 라이브
          </h1>
          <button 
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors dark:hover:bg-gray-700"
          >
            <RefreshCw size={20} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24 dark:bg-gray-900">
        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-4 gap-2">
          <TabButton 
            active={activeTab === "search"} 
            onClick={() => setActiveTab("search")}
            icon={<Search size={18} />}
            label="버스 검색"
          />
          <TabButton 
            active={activeTab === "route"} 
            onClick={() => setActiveTab("route")}
            icon={<Navigation size={18} />}
            label="경로 찾기"
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "search" && (
            <motion.div 
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 space-y-4"
            >
              <div className="relative">
                <input 
                  type="text"
                  placeholder="버스 번호를 입력하세요 (예: 1001)"
                  className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchBus()}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>

              {!selectedRoute && recentSearches.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s) => (
                    <button 
                      key={s}
                      onClick={() => { setSearchQuery(s); searchBus(); }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                  <button 
                    onClick={() => { setRecentSearches([]); localStorage.removeItem("recentBusSearches"); }}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500"
                  >
                    삭제
                  </button>
                </div>
              )}

              {user && favorites.size > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">즐겨찾는 노선</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from(favorites).map((lineId) => (
                      <button 
                        key={lineId}
                        onClick={() => { setSearchQuery(lineId); searchBus(); }}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                      >
                        {lineId}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 animate-pulse flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-100 rounded w-1/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedRoute ? (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-3xl font-black text-blue-600">{selectedRoute.lineNo}</span>
                        <p className="text-sm text-gray-500 mt-1">실시간 운행 정보</p>
                      </div>
                      <button 
                        onClick={() => setSelectedRoute(null)}
                        className="text-sm text-gray-400 hover:text-gray-600"
                      >
                        닫기
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {busLocations.length > 0 ? (
                        busLocations.map((bus) => (
                          <div key={bus.vehId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <Bus size={20} />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{bus.nodeNm}</p>
                                <p className="text-xs text-gray-400">{bus.carNo}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={cn("text-xs font-bold flex items-center gap-1 justify-end", CONGESTION_MAP[bus.congestion]?.color)}>
                                <Users size={12} />
                                {CONGESTION_MAP[bus.congestion]?.label || "정보없음"}
                              </div>
                              <button 
                                onClick={() => setSelectedStop(bus.nodeId)}
                                className="text-[10px] text-blue-500 hover:underline mt-1 block w-full text-right"
                              >
                                도착 정보 보기
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-8 text-gray-400 italic">운행 중인 버스가 없습니다.</p>
                      )}
                    </div>

                    {selectedStop && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-sm flex items-center gap-2">
                            <Clock size={16} className="text-blue-500" />
                            정류소 도착 예정 정보
                          </h3>
                          <button onClick={() => setSelectedStop(null)} className="text-xs text-gray-400">닫기</button>
                        </div>
                        <div className="space-y-2">
                          {arrivals.length > 0 ? (
                            arrivals.map((arr, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                                <span className="text-xs font-bold text-blue-700">{arr.lineNo}번</span>
                                <div className="text-right">
                                  <span className="text-xs font-black text-blue-600">{arr.min1}분 전</span>
                                  <span className="text-[10px] text-gray-400 ml-2">({arr.station1}정류장)</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-xs text-gray-400 py-4">도착 정보가 없습니다.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {routes.map((route) => (
                    <button 
                      key={route.lineId}
                      onClick={() => setSelectedRoute(route)}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-200 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Bus size={24} />
                        </div>
                        <div className="text-left">
                          <p className="text-xl font-bold">{route.lineNo}</p>
                          <p className="text-xs text-gray-400">부산광역시 시내버스</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(route); }}
                          className={cn("p-2 rounded-full transition-colors", favorites.has(route.lineId) ? "text-yellow-500" : "text-gray-300 hover:text-yellow-500")}
                        >
                          <Star size={20} fill={favorites.has(route.lineId) ? "currentColor" : "none"} />
                        </button>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "route" && (
            <motion.div 
              key="route"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 space-y-4"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-200"></div>
                    <input 
                      type="text"
                      placeholder="출발지 (예: 부산역, 서면역)"
                      className="relative w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                    <button 
                      onClick={getCurrentLocation}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Locate size={20} />
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-200"></div>
                    <input 
                      type="text"
                      placeholder="목적지 (예: 해운대역, 광안리)"
                      className="relative w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 pl-12 focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm transition-all"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                  </div>
                </div>
                <button 
                  onClick={findPath}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <Navigation size={20} />}
                  경로 검색
                </button>
              </div>

              {directions?.routes?.[0] && (
                <div className="space-y-4">
                  {mapsKey && (
                    <div className="h-64 rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                      <LoadScript googleMapsApiKey={mapsKey}>
                        <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: 35.1796, lng: 129.0756 }} zoom={12}>
                          <DirectionsRenderer directions={directions} />
                        </GoogleMap>
                      </LoadScript>
                    </div>
                  )}
                  {directions.routes[0].legs[0].steps.map((step: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white",
                          step.travel_mode === "TRANSIT" ? (step.transit_details.line.vehicle.type === "SUBWAY" ? "bg-orange-500" : "bg-blue-500") : "bg-gray-300"
                        )}>
                          {step.travel_mode === "TRANSIT" ? (
                            step.transit_details.line.vehicle.type === "SUBWAY" ? <TrainFront size={16} /> : <Bus size={16} />
                          ) : <MapPin size={16} />}
                        </div>
                        {idx < directions.routes[0].legs[0].steps.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-100 my-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: step.html_instructions }} />
                        {step.transit_details && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold text-white",
                                step.transit_details.line.vehicle.type === "SUBWAY" ? "bg-orange-500" : "bg-blue-500"
                              )}>
                                {step.transit_details.line.short_name}
                              </span>
                              <span className="text-xs font-bold">{step.transit_details.departure_stop.name} 승차</span>
                            </div>
                            <p className="text-xs text-gray-500">{step.transit_details.num_stops}개 정류장 이동</p>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1"><Clock size={10} /> {step.duration.text}</span>
                          <span className="flex items-center gap-1"><ArrowRight size={10} /> {step.distance.text}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "info" && (
            <motion.div 
              key="info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 space-y-4"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
                    <Bus size={32} />
                  </div>
                  <h2 className="text-xl font-bold">부산 버스 라이브</h2>
                  <p className="text-sm text-gray-400">버전 1.0.0</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                      <Info size={16} className="text-blue-500" />
                      이용 안내
                    </h3>
                    <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                      <li>실시간 버스 위치는 부산광역시 버스정보시스템(BMS) 데이터를 기반으로 합니다.</li>
                      <li>도착 예정 시간은 교통 상황에 따라 오차가 발생할 수 있습니다.</li>
                      <li>경로 검색은 Google Maps API를 사용합니다.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <h3 className="font-bold text-sm mb-2 text-blue-700">공지사항</h3>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      현재 공공데이터 API 승인 대기 중인 경우 버스 검색이 원활하지 않을 수 있습니다. 승인 후 최대 24시간이 소요되니 양해 부탁드립니다.
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-center text-gray-300">
                  © 2026 Busan Bus Live. All rights reserved.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <NavButton 
            active={activeTab === "search"} 
            onClick={() => setActiveTab("search")}
            icon={<Search />}
            label="검색"
          />
          <NavButton 
            active={activeTab === "route"} 
            onClick={() => setActiveTab("route")}
            icon={<Navigation />}
            label="경로"
          />
          <NavButton 
            active={activeTab === "info"} 
            onClick={() => setActiveTab("info")}
            icon={<Info />}
            label="정보"
          />
        </div>
      </nav>
    </div>
  </ErrorBoundary>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all",
        active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-white text-gray-400 hover:bg-gray-50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-blue-600" : "text-gray-400"
      )}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
