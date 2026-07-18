import { createContext, useContext } from 'react';
import type { SceneDef, SceneId } from './scenes';

export interface ToastState { key: number; text: string; symbol: string }

export interface SceneContextValue {
  scene: SceneDef | null;
  sceneId: SceneId | null;
  switching: boolean;
  switchScene: (id: SceneId) => void;
  /** 通用右下角 toast（如「已复制到剪贴板！」） */
  notify: (text: string, symbol?: string) => void;
}

export const SceneContext = createContext<SceneContextValue>({
  scene: null, sceneId: null, switching: false, switchScene: () => {}, notify: () => {},
});

export function useScene() {
  return useContext(SceneContext);
}
