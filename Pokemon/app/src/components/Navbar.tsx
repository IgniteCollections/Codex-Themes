import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Github, Menu, X } from 'lucide-react';
import { SCENES } from '@/themes/scenes';
import { useScene } from '@/themes/SceneProvider';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/', label: '首页' },
  { to: '/scenes', label: '场景图鉴' },
  { to: '/install', label: '安装配置' },
];

/** 场景 chip 下拉（design.md §6.1 右侧） */
function SceneChip() {
  const [open, setOpen] = useState(false);
  const { scene, sceneId, switchScene } = useScene();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass flex items-center gap-1.5 rounded-[2px] px-2.5 py-1.5 text-xs"
        style={{ color: 'var(--sc-fg)' }}
        aria-expanded={open}
      >
        <span style={{ color: 'var(--sc-prompt)' }}>{scene ? scene.symbol : '◓'}</span>
        <span>{scene ? scene.name : '默认'}</span>
        <ChevronDown size={12} style={{ color: 'var(--sc-fg-dim)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="glass pixel-corners absolute right-0 z-50 mt-2 w-44 p-1.5"
            >
              {SCENES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { switchScene(s.id); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-left text-sm transition-colors"
                  style={{
                    color: s.id === sceneId ? s.ui.prompt : 'var(--sc-fg)',
                    background: s.id === sceneId ? 'color-mix(in srgb, var(--sc-prompt) 10%, transparent)' : 'transparent',
                  }}
                >
                  <img src={s.icon} alt="" className="h-4 w-4" style={{ imageRendering: 'pixelated' }} />
                  <span className="flex-1">{s.name}</span>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--sc-fg-dim)' }}>{s.no}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Navbar（design.md §6.1）：sticky 玻璃导航，滚动 40px 后出底边 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="glass sticky top-0 z-50 border-b transition-[border-color] duration-200"
      style={{ borderColor: scrolled ? 'var(--sc-border)' : 'transparent', animation: 'rise-in-sm .4s ease both' }}
    >
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6 max-sm:px-4">
        {/* 左：logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="CODEX" className="h-8 w-auto" style={{ imageRendering: 'pixelated' }} />
          <span className="text-xs tracking-widest max-sm:hidden" style={{ color: 'var(--sc-fg-dim)' }}>
            宝可梦皮肤计划
          </span>
        </Link>

        {/* 中：链接（桌面） */}
        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}>
              {({ isActive }) => (
                <span
                  className="group relative inline-block px-1 py-2 text-sm transition-colors duration-150"
                  style={{ color: isActive ? 'var(--sc-accent)' : 'var(--sc-fg-dim)' }}
                >
                  {l.label}
                  <span
                    className={cn(
                      'absolute bottom-0 left-0 h-[2px] w-full origin-left transition-transform duration-200',
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    )}
                    style={{ background: 'var(--sc-accent)' }}
                  />
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* 右：场景 chip + GitHub + 汉堡（移动） */}
        <div className="flex items-center gap-3">
          <SceneChip />
          <a
            href="https://github.com/openai/codex"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="transition-colors"
            style={{ color: 'var(--sc-fg-dim)' }}
          >
            <Github size={18} />
          </a>
          <button
            type="button"
            aria-label="菜单"
            className="md:hidden"
            style={{ color: 'var(--sc-fg)' }}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {/* 移动端全屏抽屉 */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col md:hidden"
            style={{ background: 'color-mix(in srgb, var(--sc-bg) 92%, transparent)', backdropFilter: 'blur(14px)' }}
          >
            <div className="flex h-16 items-center justify-between px-4">
              <img src="/logo.svg" alt="CODEX" className="h-8 w-auto" style={{ imageRendering: 'pixelated' }} />
              <button type="button" aria-label="关闭" style={{ color: 'var(--sc-fg)' }} onClick={() => setMenuOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <div className="flex flex-1 flex-col items-start justify-center gap-8 px-8">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ x: -32, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.08 * i + 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className="font-display text-4xl tracking-wide"
                    style={{ color: 'var(--sc-fg)' }}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
