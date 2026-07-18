/* ============================================================
   安装配置页 /install（install.md）
   S1 页头 + 3 步快速上手 · S2 场景配置 Tabs × 6（config.toml /
   ANSI JSON / CSS 变量，逐字来自 install.md，由 scenes.ts 派生）
   S3 验证命令 · S4 FAQ 手风琴
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { SCENES, isSceneId, pokemonSprite, SCENE_THEME_SLUG } from '@/themes/scenes';
import type { SceneDef, SceneId } from '@/themes/scenes';
import CodeBlock from '@/components/CodeBlock';
import CopyButton from '@/components/CopyButton';
import PokeballDivider from '@/components/PokeballDivider';
import SectionHeading from '@/components/SectionHeading';
import { DESKTOP_THEMES, SNIPPETS } from '@/pages/installSnippets';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ---------------- S1 快速上手步骤卡 ---------------- */
function StepCard({ step, title, delay, children }: {
  step: string;
  title: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: EASE }}
      className="pixel-corners glass shadow-pixel flex h-full flex-col border p-5"
      style={{ borderColor: 'var(--sc-border)' }}
    >
      <p className="font-pixel mb-2 text-[10px] tracking-wider" style={{ color: 'var(--sc-accent)' }}>
        {step}
      </p>
      <h3 className="font-display mb-4 text-xl tracking-wide" style={{ color: 'var(--sc-fg)' }}>
        {title}
      </h3>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </motion.div>
  );
}

function QuickStart() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StepCard step="STEP 1" title="安装 CODEX" delay={0.26}>
        <CodeBlock code="npm i -g @openai/codex" lang="bash" filename="terminal" />
        <p className="text-[13px] leading-[1.7]" style={{ color: 'var(--sc-fg-dim)' }}>
          全局安装 CODEX 命令行（需要 Node.js 20+）。
        </p>
      </StepCard>
      <StepCard step="STEP 2" title="收服主题" delay={0.38}>
        <CodeBlock
          code={'mkdir -p ~/.codex/themes\n# 把 pokemon-grassland.tmTheme 复制进去\ncp pokemon-grassland.tmTheme ~/.codex/themes/'}
          lang="bash"
          filename="terminal"
        />
        <p className="text-[13px] leading-[1.7]" style={{ color: 'var(--sc-fg-dim)' }}>
          主题文件在仓库的 <code className="px-1 font-mono text-[12px]" style={{ background: 'var(--sc-inset)', color: 'var(--sc-accent)' }}>Pokemon/themes/</code> 目录，挑一个场景复制进{' '}
          <code className="px-1 font-mono text-[12px]" style={{ background: 'var(--sc-inset)', color: 'var(--sc-accent)' }}>~/.codex/themes/</code>。
        </p>
      </StepCard>
      <StepCard step="STEP 3" title="换上皮肤" delay={0.5}>
        <CodeBlock code={'# 启动 codex，输入：\n/theme'} lang="bash" filename="codex TUI" />
        <p className="text-[13px] leading-[1.7]" style={{ color: 'var(--sc-fg-dim)' }}>
          在主题选择器里滚动实时预览，回车收服。也可以直接写{' '}
          <code className="px-1 font-mono text-[12px]" style={{ background: 'var(--sc-inset)', color: 'var(--sc-accent)' }}>tui.theme</code>{' '}
          到 config.toml（下方片段）。
        </p>
      </StepCard>
    </div>
  );
}

/* ---------------- S2 场景配置 Tabs ---------------- */
function SceneTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState<SceneId>('grassland');
  const fromClick = useRef(false);

  /* 锚点 #grassland 等直接定位到对应 Tab（install.md S2） */
  useEffect(() => {
    const raw = location.hash.replace(/^#/, '');
    if (!isSceneId(raw)) return;
    setActive(raw);
    if (fromClick.current) {
      fromClick.current = false;
      return;
    }
    document.getElementById('config-lab')?.scrollIntoView();
  }, [location.hash]);

  const select = (id: SceneId) => {
    if (id === active) return;
    fromClick.current = true;
    setActive(id);
    navigate(`#${id}`, { replace: true });
  };

  const snip = SNIPPETS[active];

  return (
    <div>
      {/* Tab 条：场景符号 + 中文名，激活项使用对应场景色描边与文字 */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-10% 0px' }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="mb-8 flex flex-wrap gap-2.5"
        role="tablist"
        aria-label="选择场景"
      >
        {SCENES.map((s) => {
          const isActive = s.id === active;
          return (
            <motion.button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              variants={{
                hidden: { scale: 0.8, opacity: 0 },
                show: { scale: 1, opacity: 1, transition: { duration: 0.3, ease: EASE } },
              }}
              onClick={() => select(s.id)}
              className="pixel-corners flex items-center gap-2 border px-3.5 py-2 text-sm transition-transform duration-150 hover:-translate-y-0.5"
              style={{
                borderColor: isActive ? s.ui.prompt : 'var(--sc-border)',
                color: isActive ? s.ui.prompt : 'var(--sc-fg-dim)',
                background: isActive ? `color-mix(in srgb, ${s.ui.prompt} 10%, transparent)` : 'transparent',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = s.ui.prompt; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--sc-border)'; }}
            >
              <img src={s.icon} alt="" className="h-4 w-4" style={{ imageRendering: 'pixelated' }} />
              <span aria-hidden style={{ color: s.ui.prompt }}>{s.symbol}</span>
              <span className="font-medium">{s.name}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* 面板：0.25s opacity/translateY(8px) 交叉切换 */}
      <div className="relative">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={active}
            role="tabpanel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex flex-col gap-6"
          >
            {([
              { code: snip.install, lang: 'bash', filename: '① 收服主题（终端执行）' },
              { code: snip.toml, lang: 'toml', filename: '② ~/.codex/config.toml' },
              { code: snip.json, lang: 'json', filename: `③ codex-theme-${active}.json（终端模拟器调色板）` },
              { code: snip.css, lang: 'css', filename: `④ theme-${active}.css（网页变量）` },
            ] as const).map((b) => (
              <motion.div
                key={b.filename}
                initial={{ y: 24, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-5% 0px' }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <CodeBlock code={b.code} lang={b.lang} filename={b.filename} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- S1.5 桌面客户端（codex-theme-v1 导入字符串 × 7） ---------------- */
function DesktopSceneCard({ scene, index }: { scene: SceneDef; index: number }) {
  const themeString = DESKTOP_THEMES[scene.id];
  const mascot = scene.pokemon.find((p) => p.role === 'mascot') ?? scene.pokemon[0];
  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-5% 0px' }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: EASE }}
      data-scene={scene.id}
      className="pixel-corners shadow-pixel flex flex-col border p-5"
      style={{ background: 'var(--sc-panel)', borderColor: 'var(--sc-border)' }}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className="pixel-corners flex h-14 w-14 flex-none items-center justify-center border"
          style={{ background: 'var(--sc-inset)', borderColor: 'var(--sc-border)' }}
        >
          <img
            src={pokemonSprite(mascot)}
            alt={mascot.name}
            className="h-12 w-12 object-contain"
            style={{ imageRendering: 'pixelated' }}
            loading="lazy"
          />
        </div>
        <div>
          <p className="font-display text-lg leading-tight tracking-wide" style={{ color: 'var(--sc-fg)' }}>
            {scene.name}
            <span className="ml-2 font-pixel text-[10px]" style={{ color: 'var(--sc-prompt)' }}>
              {scene.symbol}
            </span>
          </p>
          <p className="font-mono text-[11px]" style={{ color: 'var(--sc-fg-dim)' }}>
            {scene.en} · pokemon-{SCENE_THEME_SLUG[scene.id]}
          </p>
        </div>
      </div>

      {/* 色板速览：accent / surface / ink / diff+ / diff- */}
      <div className="mb-4 flex gap-1.5">
        {[scene.ui.prompt, scene.ui.bg, scene.ui.fg, scene.ui['diff-add-fg'], scene.ui['diff-del-fg']].map((hex) => (
          <span
            key={hex}
            className="h-4 flex-1 border"
            title={hex}
            style={{ background: hex, borderColor: 'color-mix(in srgb, var(--sc-fg) 14%, transparent)' }}
          />
        ))}
      </div>

      <div
        className="mb-3 truncate border px-2.5 py-2 font-mono text-[10px]"
        style={{ background: 'var(--sc-inset)', borderColor: 'var(--sc-border)', color: 'var(--sc-fg-dim)' }}
        title={themeString}
      >
        {themeString}
      </div>
      <div className="mt-auto">
        <CopyButton text={themeString} />
      </div>
    </motion.div>
  );
}

function DesktopSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-[960px] px-6 max-sm:px-4">
        <SectionHeading label="DESKTOP APP" title="桌面客户端主题" />
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-8 max-w-[640px] text-sm leading-[1.8]"
          style={{ color: 'var(--sc-fg-dim)' }}
        >
          ChatGPT / Codex 桌面 App 专用。复制场景的导入字符串，打开{' '}
          <code className="px-1 font-mono text-[12px]" style={{ background: 'var(--sc-inset)', color: 'var(--sc-accent)' }}>
            Settings（Cmd+,）→ Appearance → Import
          </code>
          ，选择 <strong style={{ color: 'var(--sc-fg)' }}>dark</strong> 槽位粘贴即可。整套界面配色随场景换肤。
        </motion.p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SCENES.map((s, i) => (
            <DesktopSceneCard key={s.id} scene={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- S3 验证与常用命令 ---------------- */
const VERIFY_LINES = [
  { cmd: 'ls ~/.codex/themes/', note: '确认 pokemon-*.tmTheme 已就位' },
  { cmd: 'codex', note: '启动 TUI，输入 /theme 打开选择器' },
  { cmd: '/theme', note: '滚动实时预览，回车选定（自动写入 tui.theme）' },
  { cmd: 'grep tui.theme ~/.codex/config.toml', note: '确认配置已写入' },
];

function VerifyBlock() {
  return (
    <div
      className="pixel-corners shadow-pixel border"
      style={{ background: 'var(--sc-inset)', borderColor: 'var(--sc-border)' }}
    >
      {/* 迷你标题栏（静态 TerminalWindow 风格） */}
      <div
        className="flex items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--sc-border)', background: 'var(--sc-panel)' }}
      >
        <span aria-hidden className="h-3 w-3" style={{ background: 'var(--sc-error)' }} />
        <span aria-hidden className="h-3 w-3" style={{ background: 'var(--sc-warning)' }} />
        <span aria-hidden className="h-3 w-3" style={{ background: 'var(--sc-success)' }} />
        <span className="ml-2 font-mono text-xs" style={{ color: 'var(--sc-fg-dim)' }}>
          codex — theme
        </span>
      </div>
      <div className="terminal-screen p-4 font-mono text-sm leading-[1.9] sm:p-5">
        {VERIFY_LINES.map((l, i) => (
          <motion.div
            key={l.cmd}
            initial={{ x: -16, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-5% 0px' }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: EASE }}
            className="flex flex-col gap-0.5 whitespace-nowrap sm:flex-row sm:items-baseline sm:gap-4"
          >
            <span className="shrink-0 sm:w-[26ch]" style={{ color: 'var(--sc-output)' }}>
              {l.cmd}
            </span>
            <span className="text-sm" style={{ color: 'var(--sc-fg-dim)' }}>
              # {l.note}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- S4 FAQ ---------------- */
function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code
      className="px-1 py-0.5 font-mono text-[13px]"
      style={{ background: 'var(--sc-inset)', color: 'var(--sc-accent)' }}
    >
      {children}
    </code>
  );
}

const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: '支持哪些终端？',
    a: '任何支持真彩色（24-bit）的终端：Windows Terminal、iTerm2、Alacritty、kitty、WezTerm 以及 VS Code 内置终端。JSON 方案可直接导入 Windows Terminal。',
  },
  {
    q: '如何还原默认主题？',
    a: (
      <>
        在 CODEX TUI 里输入 <InlineCode>/theme</InlineCode> 选回任意内置主题即可；
        或者删除 <InlineCode>~/.codex/config.toml</InlineCode> 中的{' '}
        <InlineCode>tui.theme</InlineCode> 这一行。放入{' '}
        <InlineCode>~/.codex/themes/</InlineCode> 的 .tmTheme 文件留着也无妨。
      </>
    ),
  },
  {
    q: '为什么终端里只有代码块变色了？',
    a: (
      <>
        .tmTheme 管的是 CODEX 输出的<strong>语法高亮</strong>（代码块与 diff）——这是官方开放的定制范围。
        终端整体的背景与 16 色属于你终端模拟器的配色，本站每个场景同时提供 ANSI
        JSON（Windows Terminal 可直接导入）与 CSS 变量，三者搭配才是完整皮肤。
      </>
    ),
  },
  {
    q: '可以混搭场景色值吗？',
    a: (
      <>
        可以。每个色值都是独立变量，去
        <Link to="/scenes" className="underline decoration-dotted underline-offset-4" style={{ color: 'var(--sc-accent)' }}>
          图鉴页
        </Link>
        点击色块复制 hex，替换 config 里对应行即可——像给宝可梦配招一样自由。
      </>
    ),
  },
  {
    q: 'ASCII 横幅显示错位怎么办？',
    a: '请确认终端字体为等宽字体（推荐 JetBrains Mono / Cascadia Code / 等距更纱黑体），并将字号设为 13px 以上。',
  },
  {
    q: '这是官方作品吗？',
    a: '不是。本站为同人致敬项目，与任天堂、Creatures、GAME FREAK、宝可梦公司无关；所有图案均为原创像素画与字符画。',
  },
];

function FaqItem({ index, q, a, open, onToggle }: {
  index: number;
  q: string;
  a: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="pixel-corners border"
      style={{ borderColor: open ? 'var(--sc-accent)' : 'var(--sc-border)', background: 'var(--sc-panel)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="font-pixel shrink-0 text-[10px]" style={{ color: 'var(--sc-accent)' }}>
          Q{index + 1}
        </span>
        <span className="font-display flex-1 text-lg tracking-wide" style={{ color: 'var(--sc-fg)' }}>
          {q}
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          className="font-pixel shrink-0 text-sm"
          style={{ color: 'var(--sc-prompt)' }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <motion.p
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-5 pb-5 text-sm leading-[1.8] sm:pl-[58px]"
              style={{ color: 'var(--sc-fg-dim)' }}
            >
              {a}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-4">
      {FAQS.map((f, i) => (
        <FaqItem
          key={f.q}
          index={i}
          q={f.q}
          a={f.a}
          open={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
        />
      ))}
    </div>
  );
}

/* ---------------- 页面 ---------------- */
export default function Install() {
  return (
    <div style={{ background: 'var(--sc-bg)' }}>
      {/* ============ S1 页头 + 快速上手 ============ */}
      <section className="relative overflow-hidden">
        {/* 抖动纹理背景 */}
        <div
          aria-hidden
          className="dither-bg pointer-events-none absolute inset-0 opacity-[.05]"
          style={{ animation: 'drift-bg 20s linear infinite' }}
        />
        {/* 精灵球装饰 */}
        <img
          src="/pokeball.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-[8%] top-16 hidden h-16 w-16 md:block"
          style={{ imageRendering: 'pixelated', animation: 'float-y 6s ease-in-out infinite' }}
        />
        <img
          src="/pokeball.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute bottom-12 left-[5%] hidden h-10 w-10 opacity-60 lg:block"
          style={{ imageRendering: 'pixelated', animation: 'float-y 7.5s ease-in-out 1.2s infinite' }}
        />

        <div className="relative mx-auto max-w-[960px] px-6 pb-16 pt-20 max-sm:px-4 md:pt-24">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="pixel-label mb-4"
            style={{ color: 'var(--sc-accent)' }}
          >
            INSTALL · 收服指南
          </motion.p>
          <motion.h1
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.5, ease: EASE }}
            className="font-display mb-4 text-[34px] leading-[1.15] tracking-wide md:text-5xl"
            style={{ color: 'var(--sc-fg)' }}
          >
            安装与配置
          </motion.h1>
          <motion.p
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.5, ease: EASE }}
            className="mb-12 max-w-[560px] text-base leading-[1.75]"
            style={{ color: 'var(--sc-fg-dim)' }}
          >
            一个 .tmTheme 语法主题 + 一套终端调色板 + 一段 config.toml，30 秒收服你的 CODEX。
          </motion.p>
          <QuickStart />
        </div>
      </section>

      <PokeballDivider />

      {/* ============ S1.5 桌面客户端主题 ============ */}
      <DesktopSection />

      <PokeballDivider />

      {/* ============ S2 场景配置区（Tabs × 6） ============ */}
      <section id="config-lab" className="scroll-mt-24 py-16 md:py-20">
        <div className="mx-auto max-w-[960px] px-6 max-sm:px-4">
          <SectionHeading label="CONFIG LAB" title="选择你的栖息地" />
          <SceneTabs />
        </div>
      </section>

      <PokeballDivider />

      {/* ============ S3 验证与常用命令 ============ */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[960px] px-6 max-sm:px-4">
          <SectionHeading label="VERIFY" title="确认收服成功" />
          <VerifyBlock />
        </div>
      </section>

      <PokeballDivider />

      {/* ============ S4 FAQ ============ */}
      <section className="py-16 pb-24 md:py-20 md:pb-28">
        <div className="mx-auto max-w-[960px] px-6 max-sm:px-4">
          <SectionHeading label="FAQ" title="常见问题" />
          <Faq />
        </div>
      </section>
    </div>
  );
}
