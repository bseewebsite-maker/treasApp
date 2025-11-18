# TreasApp

An offline mobile app for managing collections, tracking student payments, and managing funds. All data is stored locally on your device.

## Offline Functionality (Progressive Web App)

This application has been converted into a Progressive Web App (PWA) to ensure it is fully functional offline.

### How it Works

- **Service Worker:** A service worker script runs in the background and caches all the necessary application files (like the user interface and logic).
- **Offline Access:** After you visit the app once with an internet connection, the service worker saves the app files to your device. You can then open and use the app anytime, even without an internet connection.
- **Data Storage:** All your collection and student data is stored in your browser's `localStorage`, which is designed for persistent offline storage.

### For the Best Experience: Install the App

To get the most reliable offline experience and use TreasApp like a native application, you can install it on your device's home screen.

- **On Mobile (iOS/Android):** Look for an "Add to Home Screen" or "Install App" option in your browser's menu when you have the app open.
- **On Desktop (Chrome/Edge):** Look for an install icon in the address bar.

This will add a TreasApp icon to your home screen or app launcher, allowing you to launch it directly, just like any other app.
