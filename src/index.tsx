import './core/utils/safeStoragePolyfill';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { ErrorBoundary } from './components/layout/ErrorBoundary';

// Override window.alert to prevent iframe errors
const originalAlert = window.alert;
window.alert = (msg: any) => {
  try {
    // Only try native alert if not in an iframe
    if (window.self === window.top) {
      originalAlert(msg);
      return;
    }
  } catch (e) {
    console.warn('Native alert prevented, using custom UI overlay');
  }
  
  // Custom UI Alert
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.bottom = '40px';
  div.style.left = '50%';
  div.style.transform = 'translateX(-50%)';
  div.style.backgroundColor = '#333';
  div.style.color = 'white';
  div.style.padding = '12px 24px';
  div.style.borderRadius = '8px';
  div.style.zIndex = '999999';
  div.style.whiteSpace = 'pre-wrap';
  div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  div.style.fontSize = '14px';
  div.style.maxWidth = '90vw';
  div.style.textAlign = 'center';
  div.innerText = String(msg);
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transition = 'opacity 0.3s ease';
    setTimeout(() => div.remove(), 300);
  }, 4000);
};

declare global {
  interface Date {
    toLocalDateString(): string;
  }
  interface DateConstructor {
    fromLocalDateString(dateString: string): Date;
  }
}

Date.fromLocalDateString = function(dateString: string) {
  if (!dateString || typeof dateString !== 'string') {
    return new Date();
  }
  const parts = dateString.split(/[-/]/);
  if (parts.length < 3) {
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return new Date();
  }
  
  const val1 = Number(parts[0]);
  const val2 = Number(parts[1]) - 1;
  const val3 = Number(parts[2]);
  
  if (val1 > 1000) {
    // YYYY-MM-DD
    return new Date(val1, val2, val3);
  } else if (val3 > 1000) {
    // DD-MM-YYYY or similar
    return new Date(val3, val2, val1);
  }
  return new Date(val1, val2, val3);
};

Date.prototype.toLocalDateString = function() {
  const year = this.getFullYear();
  const month = String(this.getMonth() + 1).padStart(2, '0');
  const day = String(this.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Unregister Service Workers in Capacitor to prevent White Screen on Resume
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  }).catch(function(err) {
    console.log('Service Worker unregistration failed: ', err);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
