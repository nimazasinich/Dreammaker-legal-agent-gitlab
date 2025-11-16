import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';
import './styles/theme.css';

// CRITICAL: Enforce data policy at application startup
import { assertPolicy, APP_MODE, getDataSourceLabel } from './config/dataPolicy';

try {
  assertPolicy();
  console.log(`✅ Data policy validated successfully. Mode: ${APP_MODE}, Source: ${getDataSourceLabel()}`);
} catch (error) {
  console.error('❌ DATA POLICY VIOLATION:', error);
  // Display error to user and halt application
  document.getElementById('root')!.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #1a1a1a;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
    ">
      <div style="max-width: 600px; text-align: center;">
        <h1 style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;">⚠️ Configuration Error</h1>
        <p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 1rem;">
          ${error instanceof Error ? error.message : String(error)}
        </p>
        <p style="color: #9ca3af; font-size: 0.9rem;">
          Please check your environment configuration (.env file) and ensure the data policy settings are correct.
        </p>
      </div>
    </div>
  `;
  throw error;
}

// Guard for real backend only (no mocks) - ensure proper URLs are configured
const apiBase = import.meta.env.VITE_API_BASE as string | undefined;
const wsBase = import.meta.env.VITE_WS_BASE as string | undefined;
const isDevelopment = import.meta.env.DEV;
const isHuggingFace = typeof location !== 'undefined' && location.hostname.includes('.hf.space');

if (isDevelopment) {
  console.log('🔧 Development Mode');
  console.log(`   API Base: ${apiBase || 'undefined'}`);
  console.log(`   WS Base: ${wsBase || 'undefined'}`);
  console.log(`   Expected Backend: http://localhost:8001`);
} else {
  // Production mode checks
  if (isHuggingFace) {
    console.log('🚀 HuggingFace Deployment Detected');
    if ((apiBase && apiBase.includes('localhost')) || (wsBase && wsBase.includes('localhost'))) {
      console.warn('⚠️ Environment variables contain localhost in production');
      console.warn('   Using relative paths instead for HuggingFace compatibility');
    }
    // Test backend connection
    fetch('/api/health', { timeout: 5000 } as any)
      .then(res => {
        if (res.ok) {
          console.log('✅ Backend connection successful');
        } else {
          console.error(`❌ Backend health check failed: ${res.status}`);
        }
      })
      .catch(error => {
        console.error('❌ Cannot reach backend API:', error.message);
      });
  } else if (!apiBase || !/^https:\/\//.test(apiBase)) {
    console.warn('⚠️ Production build without HTTPS configuration');
    console.warn(`   API Base: ${apiBase || 'undefined'}`);
    console.warn(`   WS Base: ${wsBase || 'undefined'}`);
    console.warn('   Tip: Set VITE_API_BASE to HTTPS URL or empty string for relative paths');
  }
}

createRoot(document.getElementById('root')!).render(
  // Temporarily disabled StrictMode to prevent double-renders in development
  // <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  // </StrictMode>
);
