import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SCENES, pokemonSprite } from '@/themes/scenes';
import type { BannerRole, SceneDef } from '@/themes/scenes';
import { useScene } from '@/themes/SceneProvider';
import PokeChip from '@/components/PokeChip';
import PixelButton from '@/components/PixelButton';
import PokeballDivider from '@/components/PokeballDivider';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

/* 横幅着色角色 → 场景变量（与 TerminalWindow 同一套规则，design.md §7 各场景横幅注释） */
const ROLE_COLOR: Record<BannerRole, string> = {
  prompt: 'var(--sc-prompt)',
  dim: 'var(--sc-fg-dim)',
  accent: 'var(--sc-accent)',
  error: 'var(--sc-error)',
  output: 'var(--sc-output)',
  del: 'var(--sc-diff-del-fg)',
};

const ANSI_NAMES = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

/* CODEX UI 配色表 6 行（key = scenes.ts ui 字段） */
const UI_ROWS = [
  { key: 'bg', label: '背景' },
  { key: 'fg', label: '前景' },
  { key: 'prompt', label: '提示符' },
  { key: 'success', label: '成功' },
  { key: 'warning', label: '警告' },
  { key: 'error', label: '错误' },
] as const;

/* 发电厂警示条纹 20s 线性无限横移（45° 条纹横向周期 = 24px / cos45° ≈ 33.94px，无缝循环） */
const STRIPE_CSS = `
@keyframes stripe-scroll { from { background-position: 0 0; } to { background-position: 33.94px 0; } }
.anim-stripe-scroll { animation: stripe-scroll 20s linear infinite; }
@media (prefers-reduced-motion: reduce) { .anim-stripe-scroll { animation: none; } }
`;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/* ---------------- S1 页头装饰：图鉴机镜头（外圈品牌红 + 玻璃高光 + 场景色呼吸灯） ---------------- */
function DexLens() {
  return (
    <div
      aria-hidden
      className="shadow-pixel relative hidden h-16 w-16 flex-none items-center justify-center rounded-full sm:flex"
      style={{ background: 'var(--brand)' }}
    >
      <div
        className="absolute inset-[5px] rounded-full"
        style={{
          background:
            'radial-gradient(circle at 34% 30%, rgba(255,255,255,.5), rgba(255,255,255,0) 45%), var(--sc-inset)',
        }}
      />
      <div
        className="anim-breathe relative h-5 w-5 rounded-full"
        style={{ background: 'var(--sc-prompt)', boxShadow: '0 0 18px var(--sc-prompt), 0 0 6px var(--sc-prompt)' }}
      />
    </div>
  );
}

/* ---------------- S3 右栏：静态迷你终端（TitleBar + ASCII 横幅 + 提示符行 + 状态栏） ---------------- */
function MiniTerminal({ scene }: { scene: SceneDef }) {
  return (
    <div
      className="pixel-corners shadow-pixel border"
      style={{ background: 'var(--sc-panel)', borderColor: 'var(--sc-border)' }}
    >
      {/* TitleBar */}
      <div
        className="flex items-center justify-between gap-3 border-b px-3 py-2"
        style={{ borderColor: 'var(--sc-border)' }}
      >
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5" style={{ background: '#F25757' }} />
          <span className="h-2.5 w-2.5" style={{ background: '#F5A623' }} />
          <span className="h-2.5 w-2.5" style={{ background: '#4CC38A' }} />
        </div>
        <span className="font-mono text-[11px]" style={{ color: 'var(--sc-fg-dim)' }}>
          codex — 80×24
        </span>
        <span
          className="glass rounded-[2px] px-1.5 py-0.5 font-mono text-[10px]"
          style={{ color: 'var(--sc-prompt)' }}
        >
          {scene.symbol} {scene.name}
        </span>
      </div>

      {/* Screen：CRT 扫描线 + 全量 ASCII 横幅 + 提示符闪烁光标 */}
      <div className="terminal-screen p-3" style={{ background: 'var(--sc-inset)' }}>
        <pre className="ascii-art">
          {scene.banner.map((line, i) =>
            line === 'stripe' ? (
              <div key={i} className="warning-stripe my-0.5 h-[8px] w-[30ch]" />
            ) : (
              <div key={i}>
                {line.map((seg, j) => (
                  <span key={j} style={{ color: ROLE_COLOR[seg.r] }}>
                    {seg.t}
                  </span>
                ))}
              </div>
            ),
          )}
        </pre>
        <div className="mt-2 font-mono text-sm">
          <span style={{ color: 'var(--sc-prompt)' }}>{scene.symbol} codex › </span>
          <span className="anim-cursor" style={{ color: 'var(--sc-prompt)' }}>
            ▌
          </span>
        </div>
      </div>

      {/* StatusBar（powerline 风格） */}
      <div
        className="flex items-center justify-between px-3 py-1.5 font-mono text-[11px]"
        style={{ background: 'var(--sc-status-bg)', color: 'var(--sc-status-fg)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold">
            {scene.symbol} {scene.name}
          </span>
          <span className="opacity-75">branch: main</span>
        </div>
        <div className="flex items-center gap-3 max-sm:gap-2">
          <span className="opacity-75 max-sm:hidden">model: codex-1</span>
          <span className="opacity-75">tokens: 12,408</span>
          <span>
            <span style={{ color: 'var(--sc-success)' }}>●</span> READY
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- S3 右栏：ANSI 色板单枚（hover 显 hex，点击复制） ---------------- */
function PaletteSwatch({
  hex,
  name,
  onCopy,
}: {
  hex: string;
  name: string;
  onCopy: (hex: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={`复制 ${name} ${hex}`}
        onClick={() => onCopy(hex)}
        className="pal-swatch group relative h-10 w-10 flex-none border max-sm:h-8 max-sm:w-8"
        style={{
          background: hex,
          borderColor: 'color-mix(in srgb, var(--sc-fg) 14%, transparent)',
          clipPath:
            'polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))',
        }}
      >
        <span
          className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
          style={{
            background: 'var(--sc-panel)',
            borderColor: 'var(--sc-border)',
            color: 'var(--sc-fg)',
          }}
        >
          {hex}
        </span>
      </button>
      <span className="font-mono text-[10px] leading-none max-sm:text-[8px]" style={{ color: 'var(--sc-fg-dim)' }}>
        {name}
      </span>
    </div>
  );
}

/* ---------------- S3 右栏：ANSI PALETTE（上排 normal / 下排 bright） ---------------- */
function AnsiPalette({ scene, onCopy }: { scene: SceneDef; onCopy: (hex: string) => void }) {
  const rows = [
    { label: 'NORMAL', start: 0 },
    { label: 'BRIGHT', start: 8 },
  ];
  return (
    <div>
      <p className="pixel-label mb-4 text-[10px]" style={{ color: 'var(--sc-accent)' }}>
        ANSI PALETTE
      </p>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3">
            <span
              className="mt-3.5 w-[52px] flex-none font-mono text-[10px] tracking-wider max-sm:hidden"
              style={{ color: 'var(--sc-fg-dim)' }}
            >
              {row.label}
            </span>
            <div className="grid flex-none grid-cols-8 gap-2 max-sm:w-full max-sm:gap-1">
              {scene.ansi.slice(row.start, row.start + 8).map((hex, i) => (
                <PaletteSwatch key={hex} hex={hex} name={ANSI_NAMES[i]} onCopy={onCopy} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- S3 右栏：CODEX UI 配色表（6 行，点击复制 hex） ---------------- */
function UiColorTable({ scene, onCopy }: { scene: SceneDef; onCopy: (hex: string) => void }) {
  return (
    <div>
      <p className="pixel-label mb-4 text-[10px]" style={{ color: 'var(--sc-accent)' }}>
        CODEX UI
      </p>
      <div
        className="pixel-corners border"
        style={{ background: 'var(--sc-panel)', borderColor: 'var(--sc-border)' }}
      >
        {UI_ROWS.map((r, i) => {
          const hex = scene.ui[r.key];
          return (
            <button
              key={r.key}
              type="button"
              aria-label={`复制${r.label} ${hex}`}
              onClick={() => onCopy(hex)}
              className={cn(
                'group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150',
                i > 0 && 'border-t',
              )}
              style={{ borderColor: 'var(--sc-border)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--sc-prompt) 7%, transparent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                className="h-4 w-4 flex-none border"
                style={{
                  background: hex,
                  borderColor: 'color-mix(in srgb, var(--sc-fg) 18%, transparent)',
                }}
              />
              <span className="flex-1 text-sm" style={{ color: 'var(--sc-fg)' }}>
                {r.label}
              </span>
              <span className="font-mono text-xs" style={{ color: 'var(--sc-fg-dim)' }}>
                {hex}
              </span>
              <span
                className="font-mono text-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                style={{ color: 'var(--sc-accent)' }}
              >
                ⧉
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- S3 档案卡（每张卡根节点带自己的 data-scene，按该场景皮肤渲染） ---------------- */
function ArchiveCard({ scene, mirror }: { scene: SceneDef; mirror: boolean }) {
  const { notify } = useScene();
  const onCopy = useCallback(
    (hex: string) => {
      void copyText(hex).then(() => notify(`已复制 ${hex}`, '✔'));
    },
    [notify],
  );

  return (
    <section id={scene.id} data-scene={scene.id} className="arc-card scroll-mt-[136px]">
      <div className="grid gap-12 lg:grid-cols-12">
        {/* ===== 左栏：信息区（桌面 sticky，随样品区长滚动驻留） ===== */}
        <div className={cn('lg:col-span-5', mirror && 'lg:order-2')}>
          <div className="arc-info relative lg:sticky lg:top-[140px]">
            {/* 巨型背景编号 */}
            <span
              aria-hidden
              className="font-pixel pointer-events-none absolute -top-8 right-0 select-none text-[96px] leading-none max-sm:text-[64px]"
              style={{ color: 'var(--sc-fg)', opacity: 0.2 }}
            >
              {scene.no.replace('No.', '')}
            </span>

            {/* 编号行 */}
            <div className="mb-4 flex items-end gap-4">
              <span
                className="font-pixel text-[36px] leading-none max-sm:text-[26px]"
                style={{ color: 'var(--sc-fg)' }}
              >
                {scene.no}
              </span>
              <span className="pb-1 text-[28px] leading-none" style={{ color: 'var(--sc-prompt)' }}>
                {scene.symbol}
              </span>
            </div>

            {/* 场景名 */}
            <div className="mb-5">
              <h2
                className="font-display text-[40px] leading-tight tracking-wide max-sm:text-[32px]"
                style={{ color: 'var(--sc-fg)' }}
              >
                {scene.name}
              </h2>
              <p className="pixel-label mt-2" style={{ color: 'var(--sc-accent)' }}>
                {scene.en}
              </p>
              <p className="mt-2 font-mono text-xs" style={{ color: 'var(--sc-fg-dim)' }}>
                ─── {scene.route} ───
              </p>
            </div>

            {/* Flavor 引文 */}
            <blockquote
              className="mb-6 border-l-4 pl-4 text-base italic leading-[1.75]"
              style={{ borderColor: 'var(--sc-prompt)', color: 'var(--sc-prompt)' }}
            >
              「{scene.flavor}」
            </blockquote>

            {/* 招牌宝可梦 sprite */}
            {(() => {
              const mascot = scene.pokemon.find((p) => p.role === 'mascot');
              if (!mascot) return null;
              return (
                <div className="mb-6 flex items-center gap-4">
                  <div
                    className="pixel-corners flex h-[104px] w-[104px] flex-none items-center justify-center border"
                    style={{ background: 'var(--sc-inset)', borderColor: 'var(--sc-border)' }}
                  >
                    <img
                      src={pokemonSprite(mascot)}
                      alt={mascot.name}
                      className="h-24 w-24 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div>
                    <p className="font-display text-lg tracking-wide" style={{ color: 'var(--sc-fg)' }}>
                      {mascot.name}
                      <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--sc-fg-dim)' }}>
                        No.{String(mascot.id).padStart(3, '0')}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--sc-prompt)' }}>
                      {mascot.types.join(' / ')}
                    </p>
                    <p className="mt-2 max-w-[300px] text-xs leading-[1.7]" style={{ color: 'var(--sc-fg-dim)' }}>
                      {mascot.flavor}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 出没宝可梦 */}
            <div className="mb-6">
              <p className="pixel-label mb-3 text-[10px]" style={{ color: 'var(--sc-fg-dim)' }}>
                出没宝可梦
              </p>
              <div className="flex flex-wrap gap-2">
                {scene.pokemon.map((p) => (
                  <PokeChip key={p.id} pokemon={p} />
                ))}
              </div>
            </div>

            {/* 神兽池（??? 稀有槽位） */}
            {scene.legendaries.length > 0 && (
              <div className="mb-6">
                <p className="pixel-label mb-3 text-[10px]" style={{ color: 'var(--sc-accent)' }}>
                  ??? 稀有遭遇
                </p>
                <div className="flex flex-wrap gap-2">
                  {scene.legendaries.map((p) => (
                    <span
                      key={p.id}
                      className="glass inline-flex items-center gap-1.5 rounded-[2px] border border-dashed px-2 py-1"
                      style={{ borderColor: 'var(--sc-accent)' }}
                    >
                      <img
                        src={pokemonSprite(p)}
                        alt={p.name}
                        className="h-6 w-6 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                        loading="lazy"
                      />
                      <span className="text-sm leading-none" style={{ color: 'var(--sc-accent)' }}>
                        {p.name}
                      </span>
                      <span className="font-mono text-[10px] leading-none" style={{ color: 'var(--sc-fg-dim)' }}>
                        {p.types.join('/')}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs italic leading-[1.7]" style={{ color: 'var(--sc-fg-dim)' }}>
                  {scene.legendaryHint}
                </p>
              </div>
            )}

            {/* 设计说明 */}
            <p className="mb-6 text-sm leading-[1.75]" style={{ color: 'var(--sc-fg-dim)' }}>
              {scene.desc}
            </p>

            {/* 关键词标签 */}
            <div className="mb-8 flex flex-wrap gap-2">
              {scene.keywords.map((k) => (
                <span
                  key={k}
                  className="glass rounded-[2px] px-2 py-1 font-mono text-xs"
                  style={{ color: 'var(--sc-fg-dim)' }}
                >
                  {k}
                </span>
              ))}
            </div>

            {/* 操作行 */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={`/?scene=${scene.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium transition-transform duration-150 hover:translate-x-1"
                style={{ color: 'var(--sc-accent)' }}
              >
                在首页体验 →
              </Link>
              <Link
                to={`/install#${scene.id}`}
                className="pixel-corners border px-3 py-1.5 font-mono text-xs transition-colors duration-150"
                style={{ borderColor: 'var(--sc-border)', color: 'var(--sc-fg-dim)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--sc-accent)';
                  e.currentTarget.style.color = 'var(--sc-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--sc-border)';
                  e.currentTarget.style.color = 'var(--sc-fg-dim)';
                }}
              >
                复制配置 ⧉
              </Link>
            </div>
          </div>
        </div>

        {/* ===== 右栏：样品区 ===== */}
        <div className={cn('space-y-8 lg:col-span-7', mirror && 'lg:order-1')}>
          {/* 像素风景图 */}
          <div className="arc-img">
            <div
              className="pixel-corners shadow-pixel group relative overflow-hidden border"
              style={{ borderColor: 'var(--sc-border)' }}
            >
              <img
                src={scene.image}
                alt={`${scene.name} · 像素风景`}
                className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ imageRendering: 'pixelated' }}
                loading="lazy"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'linear-gradient(160deg, color-mix(in srgb, var(--sc-prompt) 22%, transparent), transparent 60%)',
                }}
              />
            </div>
          </div>

          {/* 终端预览（发电厂卡下方多一条 8px 警示条纹带，20s 横移） */}
          <div className="arc-term">
            <MiniTerminal scene={scene} />
            {scene.id === 'plant' && (
              <div className="warning-stripe anim-stripe-scroll mt-3 h-[8px] w-full" aria-hidden />
            )}
          </div>

          {/* ANSI 色板 */}
          <AnsiPalette scene={scene} onCopy={onCopy} />

          {/* CODEX UI 配色表 */}
          <UiColorTable scene={scene} onCopy={onCopy} />
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   场景图鉴 /scenes — design/scenes.md
   S1 页头 · S2 scroll-spy 索引条 · S3 档案卡 ×6 · S4 页尾 CTA
   ================================================================ */
export default function Scenes() {
  const [activeId, setActiveId] = useState<string>(SCENES[0].id);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();

  /* S2 scroll-spy：视口中部（40%~45% 带）命中的场景高亮 */
  useEffect(() => {
    const sections = SCENES.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    const ob = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    );
    sections.forEach((el) => ob.observe(el));
    return () => ob.disconnect();
  }, []);

  /* 带 hash 进入（如首页漫游卡 → /scenes#ocean）：延迟等 Layout 回顶后平滑滚动到锚点 */
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  /* S3/S4 GSAP ScrollTrigger 入场（start: top 75%，与 scenes.md 动效表一致） */
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (cardsRef.current) {
        cardsRef.current.querySelectorAll('.arc-card').forEach((sec) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: sec, start: 'top 75%' },
          });
          tl.from(sec.querySelectorAll('.arc-info > *'), {
            y: 32, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out',
          })
            .from(
              sec.querySelector('.arc-img'),
              { scale: 0.96, opacity: 0, duration: 0.6, ease: 'power3.out' },
              0,
            )
            .from(
              sec.querySelector('.arc-term'),
              { y: 48, opacity: 0, duration: 0.6, ease: 'power3.out' },
              0.15,
            )
            .from(
              sec.querySelectorAll('.pal-swatch'),
              { opacity: 0, duration: 0.3, stagger: 0.03, ease: 'steps(3)' },
              0.3,
            );
        });
      }
      if (ctaRef.current) {
        gsap.from(ctaRef.current.querySelectorAll('.cta-el'), {
          y: 32, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 78%' },
        });
      }
    });
    return () => ctx.revert();
  }, []);

  const scrollToId = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <div style={{ background: 'var(--sc-bg)' }}>
      <style>{STRIPE_CSS}</style>

      {/* ============ S1 页头（Pokédex Header） ============ */}
      <header className="mx-auto flex max-w-[1200px] items-end justify-between gap-8 px-6 pb-12 pt-24 max-sm:px-4">
        <div>
          <p className="pixel-label anim-pixel-flash mb-4" style={{ color: 'var(--sc-accent)' }}>
            SCENE DEX · 図鑑 No.001–006
          </p>
          <h1
            className="font-display text-[34px] leading-[1.15] tracking-wide md:text-5xl"
            style={{ color: 'var(--sc-fg)' }}
          >
            <span className="block overflow-hidden">
              <span
                className="block"
                style={{ animation: 'rise-in .6s .1s cubic-bezier(.22,1,.36,1) backwards' }}
              >
                场景图鉴
              </span>
            </span>
          </h1>
          <p
            className="mt-4 max-w-[560px] text-base leading-[1.75]"
            style={{
              color: 'var(--sc-fg-dim)',
              animation: 'rise-in .6s .2s cubic-bezier(.22,1,.36,1) backwards',
            }}
          >
            每一个栖息地都是一套完整的终端皮肤：16 色 ANSI 调色板、专属提示符、ASCII
            横幅与出没的宝可梦。点击色块即可复制色号。
          </p>
        </div>
        <DexLens />
      </header>

      {/* ============ S2 图鉴索引条（sticky scroll-spy） ============ */}
      <nav
        aria-label="场景索引"
        className="glass sticky top-16 z-40 border-y"
        style={{ borderColor: 'var(--sc-border)' }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-1 overflow-x-auto px-6 max-sm:px-4">
          {SCENES.map((s) => {
            const active = activeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToId(s.id)}
                aria-current={active ? 'true' : undefined}
                className="relative flex flex-none items-center gap-2 px-3 py-3.5 font-mono text-[13px] transition-colors duration-200"
                style={{ color: active ? s.ui.accent : 'var(--sc-fg-dim)' }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = s.ui.accent;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = 'var(--sc-fg-dim)';
                }}
              >
                <img
                  src={s.icon}
                  alt=""
                  className="h-4 w-4"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span style={{ color: active ? s.ui.accent : s.ui.prompt }}>{s.symbol}</span>
                {s.name}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-[2px] w-full origin-left transition-transform duration-200"
                  style={{
                    background: s.ui.accent,
                    transform: active ? 'scaleX(1)' : 'scaleX(0)',
                  }}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* ============ S3 档案卡 ×6（5:7 交替镜像，间距 96px） ============ */}
      <div
        ref={cardsRef}
        className="mx-auto max-w-[1200px] space-y-24 px-6 py-24 max-sm:px-4"
      >
        {SCENES.map((s, i) => (
          <ArchiveCard key={s.id} scene={s} mirror={i % 2 === 1} />
        ))}
      </div>

      {/* ============ S4 页尾 CTA ============ */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24 max-sm:px-4">
        <PokeballDivider />
        <div ref={ctaRef} className="pt-8 text-center">
          <h2
            className="cta-el font-display mb-4 text-[32px] tracking-wide"
            style={{ color: 'var(--sc-fg)' }}
          >
            收服全部 6 个场景
          </h2>
          <p className="cta-el mb-8 text-base" style={{ color: 'var(--sc-fg-dim)' }}>
            每一套配置都可以直接复制。
          </p>
          <div className="cta-el">
            <Link to="/install">
              <PixelButton variant="primary">前往安装配置 →</PixelButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
