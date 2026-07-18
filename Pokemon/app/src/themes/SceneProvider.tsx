/* ============================================================
   SceneProvider — 全站场景状态 + 「遭遇换肤」动效编排
   - <html data-scene> 切换 + .theme-anim 过渡类（design.md §7.0）
   - 遭遇动效：白闪 ×3 → 像素百叶窗 → 中点换肤 → toast（design.md §5）
   - 状态持久化：localStorage + ?scene= URL 参数；provider 位于
     BrowserRouter 内、Routes 之上，路由切换不丢状态。
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { SCENE_MAP, isSceneId } from './scenes';
import type { SceneDef, SceneId } from './scenes';
import { SceneContext, type SceneContextValue, type ToastState } from './use-scene';

const STORAGE_KEY = 'codex-scene';

function applyToDocument(id: SceneId | null) {
  const html = document.documentElement;
  if (id) html.dataset.scene = id;
  else delete html.dataset.scene;
  html.classList.add('theme-anim');
  window.setTimeout(() => html.classList.remove('theme-anim'), 900);
}

/* ---------------- 遭遇动效覆盖层（白闪 + 8 条像素百叶窗） ---------------- */
function EncounterOverlay({ flashRef, blindsRef }: {
  flashRef: React.RefObject<HTMLDivElement | null>;
  blindsRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden>
      <div ref={flashRef} className="absolute inset-0 bg-white opacity-0" />
      <div ref={blindsRef} className="absolute inset-0 flex flex-col opacity-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-full flex-1 origin-left scale-x-0"
            style={{ background: 'var(--sc-inset, #0A0C11)', imageRendering: 'pixelated' }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- 右下角图鉴 toast ---------------- */
function FlavorToast({ toast }: { toast: ToastState | null }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[95]">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            initial={{ x: '120%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '120%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="pixel-corners glass shadow-pixel flex items-center gap-3 py-3 pl-2 pr-5"
          >
            <div className="w-1 self-stretch" style={{ background: 'var(--sc-prompt)' }} />
            <span className="font-pixel text-sm leading-none" style={{ color: 'var(--sc-prompt)' }}>
              {toast.symbol}
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--sc-fg)' }}>
              {toast.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const [sceneId, setSceneId] = useState<SceneId | null>(null);
  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const blindsRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const location = useLocation();
  const navigate = useNavigate();

  const showToast = useCallback((scene: SceneDef) => {
    window.clearTimeout(toastTimer.current);
    setToast({ key: Date.now(), text: scene.encounter, symbol: scene.symbol });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const notify = useCallback((text: string, symbol = '⧉') => {
    window.clearTimeout(toastTimer.current);
    setToast({ key: Date.now(), text, symbol });
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

  const applyScene = useCallback((id: SceneId, withToast: boolean) => {
    setSceneId(id);
    applyToDocument(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
    if (withToast) showToast(SCENE_MAP[id]);
  }, [showToast]);

  /* 首次挂载：?scene= 参数 > localStorage，直接应用不播动效 */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('scene');
    let stored: string | null = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    const initial = isSceneId(q) ? q : isSceneId(stored) ? stored : null;
    if (initial) {
      setSceneId(initial);
      document.documentElement.dataset.scene = initial;
    }
  }, []);

  /* 监听 ?scene= 变化（如 footer 场景链接）——直接应用，不播遭遇动效 */
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('scene');
    if (isSceneId(q) && q !== sceneId && !busyRef.current) {
      applyScene(q, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const switchScene = useCallback((id: SceneId) => {
    if (busyRef.current || id === sceneId) return;

    // 同步 URL（replace，不产生历史记录）
    const params = new URLSearchParams(location.search);
    params.set('scene', id);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flash = flashRef.current;
    const blinds = blindsRef.current;
    if (reduced || !flash || !blinds) {
      applyScene(id, true);
      return;
    }

    busyRef.current = true;
    setSwitching(true);
    const strips = Array.from(blinds.children) as HTMLElement[];

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set([flash, blinds], { opacity: 0 });
        busyRef.current = false;
        setSwitching(false);
      },
    });

    /* 1) 白闪 ×3（约 300ms，GBA 遭遇战闪屏） */
    tl.set([flash, blinds], { opacity: 1 })
      .fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: 'steps(1)' })
      .to(flash, { opacity: 0, duration: 0.05, ease: 'steps(1)' })
      .to(flash, { opacity: 1, duration: 0.05, ease: 'steps(1)' })
      .to(flash, { opacity: 0, duration: 0.05, ease: 'steps(1)' })
      .to(flash, { opacity: 1, duration: 0.05, ease: 'steps(1)' })
      .to(flash, { opacity: 0, duration: 0.05, ease: 'steps(1)' });

    /* 2) 像素百叶窗扫入（300ms 起，stagger 30ms，左右交错） */
    strips.forEach((el, i) => {
      gsap.set(el, { transformOrigin: i % 2 === 0 ? 'left center' : 'right center' });
    });
    tl.to(strips, { scaleX: 1, duration: 0.2, ease: 'steps(4)', stagger: 0.03 }, 0.3);

    /* 3) 中点（~450ms）：切换 data-scene，CSS 变量 0.45s 过渡 */
    tl.call(() => applyScene(id, false), [], 0.45);

    /* 4) 百叶窗收起（500~900ms）+ toast 滑入 */
    strips.forEach((el, i) => {
      gsap.set(el, { transformOrigin: i % 2 === 0 ? 'right center' : 'left center' });
    });
    tl.to(strips, { scaleX: 0, duration: 0.2, ease: 'steps(4)', stagger: 0.03 }, 0.5);
    tl.call(() => showToast(SCENE_MAP[id]), [], 0.7);
  }, [sceneId, location, navigate, applyScene, showToast]);

  const value = useMemo<SceneContextValue>(() => ({
    scene: sceneId ? SCENE_MAP[sceneId] : null,
    sceneId,
    switching,
    switchScene,
    notify,
  }), [sceneId, switching, switchScene, notify]);

  return (
    <SceneContext.Provider value={value}>
      {children}
      <EncounterOverlay flashRef={flashRef} blindsRef={blindsRef} />
      <FlavorToast toast={toast} />
    </SceneContext.Provider>
  );
}
