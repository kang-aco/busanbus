// busanbus 서비스 워커 (Service Worker)
// 역할: 앱 껍데기 파일을 캐시에 저장해 두었다가, 인터넷이 느리거나 끊겼을 때 대신 보여줍니다.
// 안드로이드 크롬이 "앱 설치" 버튼을 띄우려면 이 파일이 반드시 있어야 합니다.

const CACHE_NAME = 'busanbus-v1';

// 설치될 때 미리 저장해 둘 파일 목록 (앱 껍데기)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 1) 설치 단계: 위 파일들을 캐시에 담아둡니다.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// 2) 활성화 단계: 예전 버전 캐시를 지웁니다.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 3) 요청 가로채기 단계
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 요청이 아니면 그냥 통과
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 버스 도착정보 같은 실시간 API는 절대 캐시하지 않습니다.
  // (오래된 도착시간을 보여주면 안 되니까요)
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    return;
  }

  // 그 외 파일: 네트워크 우선 → 실패하면 캐시에서 꺼내기
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html')))
  );
});
