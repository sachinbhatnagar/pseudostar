import { createRoot } from 'react-dom/client';
import App from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import './style.css';
import './app/production.css';
import { watchForRelease } from './release';

watchForRelease();
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
