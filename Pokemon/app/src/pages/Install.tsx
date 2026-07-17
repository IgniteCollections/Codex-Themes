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
import { SCENES, isSceneId } from '@/themes/scenes';
import type { SceneId } from '@/themes/scenes';
import CodeBlock from '@/components/CodeBlock';
import PokeballDivider from '@/components/PokeballDivider';
import SectionHeading from '@/components/SectionHeading';
import { SNIPPETS } from '@/pages/installSnippets';

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
      <StepCard step="STEP 1" title="安装" delay={0.26}>
        <CodeBlock code="npm i -g @openai/codex" lang="bash" filename="terminal" />
        <p className="text-[13px] leading-[1.7]" style={{ color: 'var(--sc-fg-dim)' }}>
          全局安装 CODEX 命令行（需要 Node.js 20+）。
        </p>
      </StepCard>
      <StepCard step="STEP 2" title="写入配置" delay={0.38}>
        <p className="text-sm leading-[1.8]" style={{ color: 'var(--sc-fg-dim)' }}>
          打开{' '}
          <code className="px-1 font-mono text-[13px]" style={{ background: 'var(--sc-inset)', color: 'var(--sc-accent)' }}>
            ~/.codex/config.toml
          </code>
          ，粘贴下方任意场景片段。
        </p>
        <div
          className="pixel-corners mt-auto border px-3 py-2 font-mono text-xs"
          style={{ background: 'var(--sc-inset)', borderColor: 'var(--sc-border)', color: 'var(--sc-accent)' }}
        >
          ~/.codex/config.toml
        </div>
      </StepCard>
      <StepCard step="STEP 3" title="启动" delay={0.5}>
        <CodeBlock code="codex --theme grassland" lang="bash" filename="terminal" />
        <p className="text-[13px] leading-[1.7]" style={{ color: 'var(--sc-fg-dim)' }}>
          启动终端，野生的 CODEX 就会换上新皮肤。
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
              { code: snip.toml, lang: 'toml', filename: '~/.codex/config.toml' },
              { code: snip.json, lang: 'json', filename: `codex-theme-${active}.json` },
              { code: snip.css, lang: 'css', filename: `theme-${active}.css` },
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

/* ---------------- S3 验证与常用命令 ---------------- */
const VERIFY_LINES = [
  { cmd: 'codex theme list', note: '列出全部 6 个场景皮肤' },
  { cmd: 'codex theme apply ocean', note: '切换到海洋' },
  { cmd: 'codex theme current', note: '查看当前皮肤 → ocean' },
  { cmd: 'codex theme reset', note: '还原默认主题' },
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
        运行 <InlineCode>codex theme reset</InlineCode>，或删除{' '}
        <InlineCode>~/.codex/config.toml</InlineCode> 中的 <InlineCode>[theme]</InlineCode> 段落。
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
            三种格式，任选其一。贴上配置，启动终端，野生的 CODEX 就会换上新皮肤。
          </motion.p>
          <QuickStart />
        </div>
      </section>

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
