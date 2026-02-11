import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

// Mock Testing via MSW
if(import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_API === 'true') {
  const {worker} = await import('./mocks/browser');
  worker.start();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
