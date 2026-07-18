import { useCallback, useEffect, useRef, useState } from 'react';
import type { BannerRole, SceneDef, ScriptLine, ScriptLineKind } from '@/themes/scenes';
import { cn } from '@/lib/utils';

/* 横幅着色角色 → 场景变量（design.md §7 各场景横幅注释） */
const ROLE_COLOR: Record<BannerRole, string> = {
  prompt: 'var(--sc-prompt)',
  dim: 'var(--sc-fg-dim)',
  accent: 'var(--sc-accent)',
  error: 'var(--sc-error)',
  output: 'var(--sc-output)',
  del: 'var(--sc-diff-del-fg)',
};

const BLOCK_KINDS: ScriptLineKind[] = ['add', 'del', 'meta', 'ctx'];
const isBlock = (k: ScriptLineKind) => BLOCK_KINDS.includes(k);

/* 文本中的文件路径用 --sc-accent 高亮（design.md §6.4 着色规则） */
function AccentPath({ text, base }: { text: string; base: string }) {
  const m = /src\/[^\s（(]+/.exec(text);
  if (!m) return <span style={{ color: base }}>{text}</span>;
  const i = m.index;
  return (
    <span style={{ color: base }}>
      {text.slice(0, i)}
      <span style={{ color: 'var(--sc-accent)' }}>{m[0]}</span>
      {text.slice(i + m[0].length)}
    </span>
  );
}

function ScriptRow({ line, symbol }: { line: ScriptLine; symbol: string }) {
  const { kind, text } = line;
  if (kind === 'user') {
    return (
      <div className="whitespace-pre">
        <span style={{ color: 'var(--sc-prompt)' }}>{symbol} codex › </span>
        <span className="font-bold" style={{ color: 'var(--sc-fg)' }}>{text}</span>
      </div>
    );
  }
  if (kind === 'add' || kind === 'del') {
    return (
      <div
        className="anim-fade-in whitespace-pre px-1"
        style={{
          background: kind === 'add' ? 'var(--sc-diff-add-bg)' : 'var(--sc-diff-del-bg)',
          color: kind === 'add' ? 'var(--sc-diff-add-fg)' : 'var(--sc-diff-del-fg)',
        }}
      >
        {text}
      </div>
    );
  }
  if (kind === 'success') {
    return <div className="whitespace-pre font-bold" style={{ color: 'var(--sc-success)' }}>{text}</div>;
  }
  if (kind === 'ctx') {
    return <div className="whitespace-pre" style={{ color: 'var(--sc-output)' }}>{text}</div>;
  }
  if (kind === 'think' || kind === 'plan') {
    return (
      <div className="whitespace-pre">
        <AccentPath text={text} base="var(--sc-fg-dim)" />
      </div>
    );
  }
  return <div className="whitespace-pre" style={{ color: 'var(--sc-fg-dim)' }}>{text}</div>;
}

function CtrlBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-corners border px-3 py-1 font-mono text-xs transition-transform hover:-translate-y-0.5"
      style={{ borderColor: 'var(--sc-border)', color: 'var(--sc-fg-dim)', background: 'transparent' }}
    >
      {children}
    </button>
  );
}

type Phase = 'banner' | 'typing' | 'hold' | 'fade';

/**
 * TerminalWindow（design.md §6.4 · 核心组件）
 * 打字机演示：横幅像素闪现 0.4s → 停 0.6s → 逐行打字（用户 24ms/字，codex 16ms/字，
 * diff 行整块滑入）→ 完成停 3s → 0.4s 淡出 → 循环。进入视口 60% 自动开始，离开暂停。
 */
export default function TerminalWindow({
  scene,
  controls = false,
  className,
}: {
  scene: SceneDef;
  controls?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const progRef = useRef<{ line: number; char: number; phase: Phase }>({ line: 0, char: 0, phase: 'banner' });
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const sceneRef = useRef(scene);

  const [done, setDone] = useState<ScriptLine[]>([]);
  const [cur, setCur] = useState<ScriptLine | null>(null);
  const [fading, setFading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [cycle, setCycle] = useState(0);

  // 最新 scene 经 ref 提供给打字机循环读取（渲染期间不写 ref，由 effect 同步）
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  const stepRef = useRef<() => void>(() => {});

  const step = useCallback(() => {
    if (!playingRef.current) return;
    const p = progRef.current;
    const sc = sceneRef.current;
    const later = (ms: number) => {
      // 经 ref 自引用，避免在声明前捕获 step 本身
      timerRef.current = window.setTimeout(() => stepRef.current(), ms / speedRef.current);
    };
    if (p.phase === 'banner') {
      p.phase = 'typing';
      later(1000); // 横幅闪现 0.4s + 停顿 0.6s
      return;
    }
    if (p.phase === 'typing') {
      const script = sc.script;
      if (p.line >= script.length) {
        p.phase = 'hold';
        later(3000);
        return;
      }
      const l = script[p.line];
      if (isBlock(l.kind)) {
        setDone((d) => [...d, l]);
        p.line += 1;
        later(l.kind === 'meta' ? 110 : 160);
        return;
      }
      p.char += 1;
      setCur({ kind: l.kind, text: l.text.slice(0, p.char) });
      if (p.char >= l.text.length) {
        setDone((d) => [...d, l]);
        setCur(null);
        p.line += 1;
        p.char = 0;
        later(220);
      } else {
        later(l.kind === 'user' ? 24 : 16);
      }
      return;
    }
    if (p.phase === 'hold') {
      p.phase = 'fade';
      setFading(true);
      later(400);
      return;
    }
    // fade → 重置重播
    setFading(false);
    setDone([]);
    setCur(null);
    p.line = 0;
    p.char = 0;
    p.phase = 'banner';
    setCycle((c) => c + 1);
    later(400);
  }, []);

  // step 通过 ref 暴露给 later() 的自引用调用（避免声明前捕获）；
  // 渲染期间不写 ref，由 effect 同步
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const play = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    timerRef.current = window.setTimeout(step, 0);
  }, [step]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    window.clearTimeout(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    window.clearTimeout(timerRef.current);
    progRef.current = { line: 0, char: 0, phase: 'banner' };
    setDone([]);
    setCur(null);
    setFading(false);
    setCycle((c) => c + 1);
  }, []);

  const replay = useCallback(() => {
    reset();
    playingRef.current = true;
    setPlaying(true);
    timerRef.current = window.setTimeout(step, 200);
  }, [reset, step]);

  /* 场景切换：0.2s 交叉淡化（key 重挂载 + anim-fade-in），对话流重置重播 */
  useEffect(() => {
    const wasPlaying = playingRef.current;
    reset(); // eslint-disable-line react-hooks/set-state-in-effect -- 场景 prop 变化即外部事件，重置打字机进度是预期同步
    if (wasPlaying) {
      timerRef.current = window.setTimeout(step, 600);
    }
  }, [scene, reset, step]);

  /* 进入视口 60% 自动开始；离开暂停 */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.6) play();
          else pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [play, pause]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const toggleSpeed = () => {
    const next = speedRef.current === 1 ? 2 : 1;
    speedRef.current = next;
    setSpeed(next as 1 | 2);
  };

  return (
    <div
      ref={rootRef}
      className={cn('pixel-corners terminal-glow border', className)}
      style={{ background: 'var(--sc-panel)', borderColor: 'var(--sc-border)' }}
    >
      {/* TitleBar */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5" style={{ borderColor: 'var(--sc-border)' }}>
        <div className="flex gap-1.5">
          <span className="h-3 w-3" style={{ background: '#F25757' }} />
          <span className="h-3 w-3" style={{ background: '#F5A623' }} />
          <span className="h-3 w-3" style={{ background: '#4CC38A' }} />
        </div>
        <span className="font-mono text-xs" style={{ color: 'var(--sc-fg-dim)' }}>codex — 80×24</span>
        <span className="glass rounded-[2px] px-2 py-0.5 font-mono text-[10px]" style={{ color: 'var(--sc-prompt)' }}>
          {scene.symbol} {scene.name}
        </span>
      </div>

      {/* Screen */}
      <div className="terminal-screen" style={{ background: 'var(--sc-inset)' }}>
        <div
          key={scene.id}
          className={cn(
            'anim-fade-in flex h-[520px] flex-col gap-3 p-4 font-mono text-sm transition-opacity duration-300 max-sm:h-[440px] max-sm:text-[12.5px]',
            fading && 'opacity-0',
          )}
        >
          <pre key={cycle} className="ascii-art anim-pixel-flash flex-none">
            {scene.banner.map((line, i) =>
              line === 'stripe' ? (
                <div key={i} className="warning-stripe my-0.5 h-[8px] w-[30ch]" />
              ) : (
                <div key={i}>
                  {line.map((seg, j) => (
                    <span key={j} style={{ color: ROLE_COLOR[seg.r] }}>{seg.t}</span>
                  ))}
                </div>
              ),
            )}
          </pre>
          <div className="min-h-0 flex-1 overflow-y-hidden overflow-x-auto" style={{ lineHeight: 1.6 }}>
            {done.map((l, i) => (
              <ScriptRow key={i} line={l} symbol={scene.symbol} />
            ))}
            {cur && <ScriptRow line={cur} symbol={scene.symbol} />}
            <span className="anim-cursor" style={{ color: 'var(--sc-prompt)' }}>▌</span>
          </div>
        </div>
      </div>

      {/* StatusBar（powerline 风格） */}
      <div
        className="flex items-center justify-between px-3 py-1.5 font-mono text-xs"
        style={{ background: 'var(--sc-status-bg)', color: 'var(--sc-status-fg)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold">{scene.symbol} {scene.name}</span>
          <span className="opacity-75">branch: main</span>
        </div>
        <div className="flex items-center gap-3 max-sm:gap-2">
          <span className="opacity-75 max-sm:hidden">model: codex-1</span>
          <span className="opacity-75">tokens: 12,408</span>
          <span><span style={{ color: 'var(--sc-success)' }}>●</span> READY</span>
        </div>
      </div>

      {/* 控制条（仅首页） */}
      {controls && (
        <div className="flex items-center gap-2 border-t px-3 py-2" style={{ borderColor: 'var(--sc-border)' }}>
          <CtrlBtn onClick={playing ? pause : play}>{playing ? '⏸ 暂停' : '▶ 演示'}</CtrlBtn>
          <CtrlBtn onClick={replay}>↺ 重播</CtrlBtn>
          <CtrlBtn onClick={toggleSpeed}>速度 {speed}×</CtrlBtn>
        </div>
      )}
    </div>
  );
}
