import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Assicurati che questo file esista (generato da Tailwind)

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered scope:', registration.scope);
      })
      .catch(err => {
        console.log('SW registration failed:', err);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);