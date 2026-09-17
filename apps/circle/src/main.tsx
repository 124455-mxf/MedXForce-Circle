import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CirclePortraitGuard } from './components/CirclePortraitGuard';
import { CIRCLE_BUILD_ID } from './lib/circleBuildId';
import { installCircleStaleChunkReload } from './lib/circleStaleChunkReload';
import { bootstrapCircleTextSize } from './lib/circleTextSizePreferences';
import './index.css';

installCircleStaleChunkReload();
bootstrapCircleTextSize();
console.info(`[Circle] build ${CIRCLE_BUILD_ID}`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CirclePortraitGuard>
      <App />
    </CirclePortraitGuard>
  </StrictMode>,
);
