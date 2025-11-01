/* eslint-disable no-restricted-globals */

// RideQ Service Worker
// Note: Using Supabase Realtime for in-app notifications instead of push notifications
console.log('RideQ Service Worker Loading...');

self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  event.waitUntil(clients.claim());
});

// Service worker is ready for future enhancements like caching
console.log('✅ RideQ Service Worker Loaded Successfully!');
