/* 사고내비 서비스 워커
   - 앱 화면(HTML)은 항상 네트워크 먼저: 새 버전이 바로 보이고, 신호가 없을 때만 저장본을 연다.
   - 글꼴·라이브러리·AI 모델 파일은 버전이 고정돼 있어 저장본 먼저.
   - AI 중계 서버 요청과 사진은 저장하지 않는다. */
const V = "sagonavi-v2";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./apple-touch-icon.png"];
const LIBS = [
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js",
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE).then(() => Promise.allSettled(LIBS.map((u) => c.add(u))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname === "sago-navi-ai.netlify.app" || u.pathname.startsWith("/api/") || u.protocol === "data:" || u.protocol === "blob:") return;
  const html = r.mode === "navigate" || (u.origin === location.origin && (u.pathname.endsWith("/") || u.pathname.endsWith(".html")));
  if (html) {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put("./index.html", cp)); } return res; })
      .catch(() => caches.match("./index.html").then((m) => m || caches.match("./"))));
    return;
  }
  const lib = u.hostname === "cdn.jsdelivr.net" || u.hostname === "storage.googleapis.com" || u.hostname === "tfhub.dev" || u.hostname.endsWith("kaggle.com") || u.origin === location.origin;
  if (!lib) return;
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; })));
});
