import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { SceneProvider } from '@/themes/SceneProvider';
import './index.css';
import App from './App.tsx';

/* 不使用 StrictMode（会导致 canvas/动效 effect 双跑）；
   SceneProvider 在 Routes 之上 —— 场景状态跨路由保持。 */
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <SceneProvider>
      <App />
    </SceneProvider>
  </BrowserRouter>,
)
