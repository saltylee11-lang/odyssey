// This worker supports installation. Journal requests use the browser's normal network handling.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
