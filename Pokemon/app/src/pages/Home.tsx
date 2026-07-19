import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Copy, Grid2X2, Hash, Zap } from 'lucide-react';
import { SCENES, SCENE_MAP } from '@/themes/scenes';
import type { SceneDef } from '@/themes/scenes';
import { useScene } from '@/themes/use-scene';
import TerminalWindow from '@/components/TerminalWindow';
import SceneSwitcher from '@/components/SceneSwitcher';
import PixelButton from '@/components/PixelButton';
import PokeChip from '@/components/PokeChip';
import SectionHeading from '@/components/SectionHeading';
import PokeballDivider from '@/components/PokeballDivider';
import CodeBlock from '@/components/CodeBlock';

gsap.registerPlugin(ScrollTrigger);

const INSTALL_CMD = 'npm i -g @openai/codex';

/* 入场动画工具：滑升 + 延迟 */
const rise = (delay: number, dur = 0.6): CSSProperties => ({
  animation: `rise-in ${dur}s ${delay}s cubic-bezier(.22,1,.36,1) backwards`,
});

/* 漂浮的场景符号（hero 背景装饰） */
const FLOAT_SPOTS = [
  { l: '5%', t: '16%', s: 24, d: 6.5, dl: 0 },
  { l: '42%', t: '6%', s: 20, d: 7.5, dl: 0.8 },
  { l: '88%', t: '10%', s: 28, d: 5.5, dl: 1.6 },
  { l: '95%', t: '48%', s: 22, d: 8.5, dl: 0.4 },
  { l: '3%', t: '68%', s: 26, d: 6.0, dl: 1.2 },
  { l: '36%', t: '90%', s: 20, d: 9.0, dl: 2.0 },
  { l: '86%', t: '86%', s: 24, d: 7.0, dl: 0.6 },
];

function FloatingSymbols({ symbol }: { symbol: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {FLOAT_SPOTS.map((p, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: p.l, top: p.t,
            animation: `float-y ${p.d}s ease-in-out ${p.dl}s infinite`,
          }}
        >
          <span
            key={symbol}
            className="anim-pixel-flash pointer-events-auto inline-block cursor-default transition-transform duration-500 hover:rotate-[360deg]"
            style={{ color: 'var(--sc-fg-dim)', fontSize: p.s, opacity: 0.55 }}
          >
            {symbol}
          </span>
        </span>
      ))}
    </div>
  );
}

/* 「复制安装命令」次按钮 */
function InstallCopyButton() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const onClick = async () => {
    try { await navigator.clipboard.writeText(INSTALL_CMD); } catch { /* ignore */ }
    window.clearTimeout(timer.current);
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <PixelButton variant="ghost" onClick={onClick} style={copied ? { borderColor: 'var(--sc-success)', color: 'var(--sc-success)' } : undefined}>
      {copied ? '✔ 已复制' : '复制安装命令'}
    </PixelButton>
  );
}

/* S3 漫游卡：每张卡使用自己场景的变量（data-scene 作用域到卡片根节点） */
function TourCard({ scene }: { scene: SceneDef }) {
  return (
    <div
      data-scene={scene.id}
      className="tour-card pixel-corners glass shadow-pixel w-[320px] flex-none snap-start border transition-transform duration-300 hover:-translate-y-1.5"
      style={{ borderColor: 'var(--sc-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--sc-accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--sc-border)'; }}
    >
      <div className="h-[180px] overflow-hidden">
        <img
          src={scene.image}
          alt={scene.name}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.06]"
          style={{ imageRendering: 'pixelated' }}
          loading="lazy"
        />
      </div>
      <div className="flex h-[240px] flex-col p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="pixel-label text-[10px]" style={{ color: 'var(--sc-accent)' }}>{scene.no}</span>
          <span className="text-xl leading-none" style={{ color: 'var(--sc-prompt)' }}>{scene.symbol}</span>
        </div>
        <h3 className="font-display mb-3 text-[26px] leading-tight" style={{ color: 'var(--sc-fg)' }}>
          {scene.name}
        </h3>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {scene.pokemon.map((p) => (
            <PokeChip key={p.name} pokemon={p} />
          ))}
        </div>
        <p className="mb-4 truncate text-sm" style={{ color: 'var(--sc-fg-dim)' }}>
          {scene.flavorShort}
        </p>
        <Link
          to={`/scenes#${scene.id}`}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium transition-transform hover:translate-x-1"
          style={{ color: 'var(--sc-accent)' }}
        >
          查看档案 →
        </Link>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Hash, no: '01', title: 'ANSI 16 色精准调校',
    body: '每个场景的 normal/bright 两组色板逐一对齐角色语义，红是错误、绿是成功——在任何终端里都读出同一种感觉。',
  },
  {
    icon: Zap, no: '02', title: '一键换肤，遭遇仪式感',
    body: '点一下场景图标，白闪、百叶窗、图鉴提示音——像真的在草丛里遇到了它。',
  },
  {
    icon: Copy, no: '03', title: '配置即复制',
    body: 'config.toml、ANSI JSON、CSS 变量三种格式全部备好，30 秒贴进你的终端与编辑器。',
  },
  {
    icon: Grid2X2, no: '04', title: '像素 × 玻璃',
    body: '8-bit 的棱角叠上现代玻璃质感，终端也能有收藏品的精致。',
  },
];

export default function Home() {
  const { scene, switchScene } = useScene();
  const termScene = scene ?? SCENE_MAP.grassland;
  const tourRef = useRef<HTMLDivElement | null>(null);
  const featRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  /* GSAP ScrollTrigger 区段入场（start: "top 78%"） */
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (tourRef.current) {
        gsap.from(tourRef.current.querySelectorAll('.tour-card'), {
          x: 80, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: tourRef.current, start: 'top 78%' },
        });
      }
      if (featRef.current) {
        gsap.from(featRef.current.querySelectorAll('.feat-card'), {
          y: 40, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: featRef.current, start: 'top 78%' },
        });
      }
      if (stepsRef.current) {
        gsap.from(stepsRef.current.querySelectorAll('.step-card'), {
          y: 40, opacity: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 78%' },
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

  return (
    <div style={{ background: 'var(--sc-bg)' }}>
      {/* ============ S1 Hero ============ */}
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden">
        {/* 场景色径向光晕 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 50% at 70% 20%, color-mix(in srgb, var(--sc-prompt) 14%, transparent), transparent)' }}
        />
        {/* 抖动纹理（0.6s 淡入 + 20s 漂浮） */}
        <div
          className="dither-bg pointer-events-none absolute inset-0 opacity-[.06]"
          style={{ animation: 'fade-in .6s ease both, drift-bg 20s linear infinite' }}
        />
        {/* 巨型 CODEX 水印（仅桌面） */}
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex">
          <span className="font-watermark select-none text-[220px] leading-none" style={{ color: 'var(--sc-fg)', opacity: 0.04 }}>
            CODEX
          </span>
        </div>
        <FloatingSymbols symbol={scene ? scene.symbol : '◓'} />

        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 py-24 max-sm:px-4 lg:grid-cols-12">
          {/* 左侧文案 */}
          <div className="lg:col-span-5">
            {/* Pixel 徽章 */}
            <div
              className="glass anim-pixel-flash mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2"
              style={{ animationDelay: '0.05s' }}
            >
              <span style={{ color: 'var(--brand)' }}>◓</span>
              <span className="font-pixel text-[10px] tracking-wider" style={{ color: 'var(--sc-accent)' }}>
                CODEX × POKÉMON SKIN PACK
              </span>
            </div>

            {/* 主标题（两行） */}
            <h1 className="font-display mb-6 text-[40px] leading-[1.1] tracking-wide md:text-[64px]">
              <span className="block overflow-hidden">
                <span className="block" style={{ ...rise(0.15), color: 'var(--sc-fg)' }}>给你的 CODEX</span>
              </span>
              <span className="block overflow-hidden">
                <span className="block" style={{ ...rise(0.27), color: 'var(--sc-prompt)' }}>换上宝可梦皮肤</span>
              </span>
            </h1>

            {/* 副文案 */}
            <p className="mb-8 max-w-[420px] text-base leading-[1.75]" style={{ ...rise(0.39), color: 'var(--sc-fg-dim)' }}>
              9 个精心调校的终端场景 —— 草原、海洋、洞穴、岩浆、雪原、无人发电厂、宇宙、城市、实验室。选择栖息地，你的 AI 编程搭档就会换上对应的配色、横幅与宝可梦伙伴。
            </p>

            {/* CTA 行 */}
            <div className="mb-10 flex flex-wrap items-center gap-4" style={rise(0.47)}>
              <Link to="/scenes">
                <PixelButton variant="primary">进入场景图鉴 →</PixelButton>
              </Link>
              <InstallCopyButton />
            </div>

            {/* 统计行 */}
            <div className="mb-10 flex gap-10" style={rise(0.55)}>
              {[
                { n: '09', l: '场景' },
                { n: '85', l: '出没宝可梦' },
                { n: '300+', l: '调校色值' },
              ].map((s) => (
                <div key={s.l} className="flex flex-col gap-1.5">
                  <span className="font-pixel text-[22px] leading-none" style={{ color: 'var(--sc-prompt)' }}>{s.n}</span>
                  <span className="text-xs" style={{ color: 'var(--sc-fg-dim)' }}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* 场景切换器 */}
            <div style={rise(0.63)}>
              <p className="pixel-label mb-4 text-[10px]" style={{ color: 'var(--sc-fg-dim)' }}>
                选择栖息地 ▸
              </p>
              <SceneSwitcher />
            </div>
          </div>

          {/* 右侧：CODEX 终端模拟器 */}
          <div className="lg:col-span-7" style={rise(0.2, 0.7)}>
            <div style={{ animation: 'float-window 6s ease-in-out 1.2s infinite' }}>
              <TerminalWindow scene={termScene} controls />
            </div>
          </div>
        </div>
      </section>

      {/* ============ S2 精灵球分隔带 ============ */}
      <PokeballDivider />

      {/* ============ S3 场景漫游 ============ */}
      <section className="py-24">
        <div className="mx-auto max-w-[1200px] px-6 max-sm:px-4">
          <SectionHeading label="SCENE DEX" title="九个栖息地，九种手感" />
        </div>
        <div className="relative">
          <div
            ref={tourRef}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-6 pt-2 max-sm:px-4"
          >
            {SCENES.map((s) => (
              <TourCard key={s.id} scene={s} />
            ))}
          </div>
          {/* 左右渐隐遮罩 */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16" style={{ background: 'linear-gradient(to right, var(--sc-bg), transparent)' }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16" style={{ background: 'linear-gradient(to left, var(--sc-bg), transparent)' }} />
        </div>
      </section>

      {/* ============ S4 特性区 ============ */}
      <section className="py-24">
        <div className="mx-auto max-w-[1200px] px-6 max-sm:px-4">
          <SectionHeading label="FEATURES" title="像收服宝可梦一样，收服你的终端" />
          <div ref={featRef} className="grid gap-6 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.no}
                className="feat-card pixel-corners glass group relative overflow-hidden border p-6 transition-transform duration-300 hover:-translate-y-1.5"
                style={{ borderColor: 'var(--sc-border)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--sc-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--sc-border)'; }}
              >
                <span
                  aria-hidden
                  className="font-pixel absolute -top-2 right-3 select-none text-[64px] leading-none"
                  style={{ color: 'var(--sc-fg)', opacity: 0.12 }}
                >
                  {f.no}
                </span>
                <div
                  className="pixel-corners mb-5 flex h-10 w-10 items-center justify-center border group-hover:animate-[pixel-bob_.4s_steps(2)_infinite]"
                  style={{ borderColor: 'var(--sc-border)', color: 'var(--sc-prompt)' }}
                >
                  <f.icon size={20} />
                </div>
                <h3 className="font-display mb-2.5 text-[22px] tracking-wide" style={{ color: 'var(--sc-fg)' }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-[1.75]" style={{ color: 'var(--sc-fg-dim)' }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ S5 三步上手 ============ */}
      <section className="py-24">
        <div className="mx-auto max-w-[1200px] px-6 max-sm:px-4">
          <SectionHeading label="QUICK START" title="30 秒完成收服" />
          <div ref={stepsRef} className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {/* 像素虚线连接（桌面） */}
            <div aria-hidden className="absolute left-0 right-0 top-10 hidden border-t-2 border-dashed md:block" style={{ borderColor: 'var(--sc-border)' }} />
            {/* 01 安装 CODEX */}
            <div className="step-card relative">
              <p className="pixel-label mb-3 text-[10px]" style={{ color: 'var(--sc-prompt)' }}>01</p>
              <h3 className="font-display mb-3 text-xl tracking-wide" style={{ color: 'var(--sc-fg)' }}>安装 CODEX</h3>
              <CodeBlock code={INSTALL_CMD} lang="bash" filename="terminal" />
            </div>
            {/* 02 选择场景 */}
            <div className="step-card relative">
              <p className="pixel-label mb-3 text-[10px]" style={{ color: 'var(--sc-prompt)' }}>02</p>
              <h3 className="font-display mb-3 text-xl tracking-wide" style={{ color: 'var(--sc-fg)' }}>选择场景</h3>
              <p className="mb-4 text-sm leading-[1.75]" style={{ color: 'var(--sc-fg-dim)' }}>
                在图鉴里挑一个栖息地，复制它的 <code className="font-mono" style={{ color: 'var(--sc-accent)' }}>config.toml</code> 片段。
              </p>
              <div className="flex gap-2">
                {SCENES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={s.name}
                    title={s.name}
                    onClick={() => switchScene(s.id)}
                    className="glass pixel-corners flex h-9 w-9 items-center justify-center border transition-transform hover:-translate-y-1"
                    style={{ borderColor: 'var(--sc-border)' }}
                  >
                    <img src={s.icon} alt="" className="h-5 w-5" style={{ imageRendering: 'pixelated' }} />
                  </button>
                ))}
              </div>
            </div>
            {/* 03 启动换肤 */}
            <div className="step-card relative">
              <p className="pixel-label mb-3 text-[10px]" style={{ color: 'var(--sc-prompt)' }}>03</p>
              <h3 className="font-display mb-3 text-xl tracking-wide" style={{ color: 'var(--sc-fg)' }}>启动换肤</h3>
              <CodeBlock code="codex --theme grassland" lang="bash" filename="terminal" />
              <p className="mt-3 text-sm" style={{ color: 'var(--sc-fg-dim)' }}>
                终端启动，野生的 codex 换上了新皮肤。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ S6 CTA 横幅 ============ */}
      <section className="px-6 py-24 max-sm:px-4">
        <div
          ref={ctaRef}
          className="pixel-corners glass shadow-pixel relative mx-auto max-w-[1200px] overflow-hidden border p-16 text-center max-sm:p-10"
          style={{ borderColor: 'var(--sc-border)' }}
        >
          {/* 呼吸光晕 */}
          <div
            aria-hidden
            className="anim-breathe pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(50% 60% at 50% 40%, color-mix(in srgb, var(--sc-prompt) 22%, transparent), transparent)' }}
          />
          <div className="relative">
            <img
              src="/pokeball.svg"
              alt="精灵球"
              className="cta-el mx-auto mb-6 h-12 w-12"
              style={{ imageRendering: 'pixelated' }}
            />
            <h2 className="cta-el font-display mb-4 text-3xl tracking-wide md:text-[40px]" style={{ color: 'var(--sc-fg)' }}>
              准备好收服你的场景了吗？
            </h2>
            <p className="cta-el mb-8 text-base" style={{ color: 'var(--sc-fg-dim)' }}>
              9 个栖息地 · 85 只宝可梦 · 完全免费
            </p>
            <div className="cta-el flex flex-wrap items-center justify-center gap-4">
              <Link to="/scenes">
                <PixelButton variant="primary">进入场景图鉴</PixelButton>
              </Link>
              <Link to="/install">
                <PixelButton variant="ghost">立即安装</PixelButton>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
