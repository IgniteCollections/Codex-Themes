import { useEffect, useRef, useState } from 'react';

/**
 * 自定义像素光标（design.md §5）：默认 10px 像素菱形 ◆（场景强调色），
 * 悬停可交互元素变为 ⚡ 并放大 1.3x；文本输入区恢复原生 cursor；
 * 移动端（粗指针）禁用；页脚提供「还原系统光标」开关。
 */
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  // 初始值惰性计算（matchMedia/localStorage 仅在客户端读取一次），
  // 避免在 effect 里同步 setState 触发级联渲染
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const fine = window.matchMedia('(pointer: fine)').matches;
    let pref: string | null = null;
    try { pref = localStorage.getItem('codex-cursor'); } catch { /* ignore */ }
    return fine && pref !== 'native';
  });
  const [mode, setMode] = useState<'default' | 'pointer' | 'text'>('default');

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const handler = (e: Event) => {
      const v = (e as CustomEvent<string>).detail;
      setEnabled(fine && v !== 'native');
    };
    window.addEventListener('codex:cursor', handler);
    return () => window.removeEventListener('codex:cursor', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('custom-cursor', enabled);
    if (!enabled) return;
    const move = (e: MouseEvent) => {
      const el = ref.current;
      if (el) el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea')) setMode('text');
      else if (t.closest('a,button,[role="button"],select,label')) setMode('pointer');
      else setMode('default');
    };
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      document.documentElement.classList.remove('custom-cursor');
    };
  }, [enabled]);

  if (!enabled || mode === 'text') return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100]"
      style={{ transform: 'translate(-100px,-100px)' }}
    >
      <div style={{ transform: 'translate(-50%,-50%)' }}>
        {mode === 'pointer' ? (
          <span style={{ color: 'var(--sc-prompt)', fontSize: 14, display: 'inline-block', transform: 'scale(1.3)' }}>⚡</span>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}>
            <rect x="4" y="0" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="2" y="2" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="6" y="2" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="0" y="4" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="4" y="4" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="8" y="4" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="2" y="6" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="6" y="6" width="2" height="2" fill="var(--sc-prompt)" />
            <rect x="4" y="8" width="2" height="2" fill="var(--sc-prompt)" />
          </svg>
        )}
      </div>
    </div>
  );
}
