import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CirclePortraitGuard } from './components/CirclePortraitGuard';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CirclePortraitGuard>
      <App />
    </CirclePortraitGuard>
  </StrictMode>,
);
