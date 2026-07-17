import { useState } from 'react';
import { Link } from 'react-router';
import { SCENES } from '@/themes/scenes';

const NAV = [
  { to: '/', label: '首页' },
  { to: '/scenes', label: '场景图鉴' },
  { to: '/install', label: '安装配置' },
];

const RESOURCES = [
  { href: 'https://github.com/openai/codex', label: 'GitHub' },
  { href: 'https://github.com/openai/codex/releases', label: '更新日志' },
  { href: 'https://github.com/openai/codex/issues', label: '反馈' },
];

/** 「还原系统光标」无障碍开关（design.md §5/§6.2） */
function CursorToggle() {
  const [native, setNative] = useState(() => {
    try { return localStorage.getItem('codex-cursor') === 'native'; } catch { return false; }
  });
  const toggle = () => {
    const next = !native;
    setNative(next);
    try { localStorage.setItem('codex-cursor', next ? 'native' : 'pixel'); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('codex:cursor', { detail: next ? 'native' : 'pixel' }));
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="font-mono text-xs underline decoration-dotted underline-offset-4 transition-colors"
      style={{ color: 'var(--sc-fg-dim)' }}
    >
      {native ? '启用像素光标' : '还原系统光标'}
    </button>
  );
}

/** Footer（design.md §6.2）：4 列 + 精灵球分隔线 + 版权行 */
export default function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--sc-border)', background: 'var(--sc-panel)' }}>
      <div className="mx-auto max-w-[1200px] px-6 py-14 max-sm:px-4" style={{ animation: 'rise-in-sm .5s ease both' }}>
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* 品牌列 */}
          <div className="col-span-2 md:col-span-1">
            <img src="/logo.svg" alt="CODEX" className="mb-4 h-8 w-auto" style={{ imageRendering: 'pixelated' }} />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--sc-fg-dim)' }}>
              给你的 CODEX 换上宝可梦皮肤。
            </p>
          </div>
          {/* 导航列 */}
          <div>
            <p className="pixel-label mb-4 text-[10px]" style={{ color: 'var(--sc-accent)' }}>导航</p>
            <ul className="space-y-2.5">
              {NAV.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm transition-colors hover:underline" style={{ color: 'var(--sc-fg-dim)' }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* 场景列 */}
          <div>
            <p className="pixel-label mb-4 text-[10px]" style={{ color: 'var(--sc-accent)' }}>场景</p>
            <ul className="space-y-2.5">
              {SCENES.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/?scene=${s.id}`}
                    className="text-sm transition-colors hover:underline"
                    style={{ color: 'var(--sc-fg-dim)' }}
                  >
                    <span className="mr-1.5" style={{ color: s.ui.prompt }}>{s.symbol}</span>
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* 资源列 */}
          <div>
            <p className="pixel-label mb-4 text-[10px]" style={{ color: 'var(--sc-accent)' }}>资源</p>
            <ul className="space-y-2.5">
              {RESOURCES.map((r) => (
                <li key={r.label}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm transition-colors hover:underline"
                    style={{ color: 'var(--sc-fg-dim)' }}
                  >
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 精灵球分隔线 */}
        <div
          aria-hidden
          className="my-10 select-none text-center font-mono text-sm"
          style={{ color: 'var(--sc-fg-dim)' }}
        >
          ────────── <span style={{ color: 'var(--brand)' }}>◓</span> ──────────
        </div>

        {/* 版权行 */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs" style={{ color: 'var(--sc-fg-dim)' }}>
            © 2025 CODEX 宝可梦皮肤计划 · 同人致敬作品，与任天堂/宝可梦公司无关
          </p>
          <CursorToggle />
        </div>
      </div>
    </footer>
  );
}
