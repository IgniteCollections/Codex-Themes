import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BannerRole, SceneDef, ScriptLine, ScriptLineKind } from "./scene-data";
import { POKEMON_ART } from "./mascotArt";

/* 横幅着色角色 → 场景变量（与展示站 TerminalWindow 一致） */
const ROLE_COLOR: Record<BannerRole, string> = {
  prompt: "var(--sc-prompt)",
  dim: "var(--sc-fg-dim)",
  accent: "var(--sc-accent)",
  error: "var(--sc-error)",
  output: "var(--sc-output)",
  del: "var(--sc-diff-del-fg)",
};

const BLOCK_KINDS: ScriptLineKind[] = ["add", "del", "meta", "ctx"];

/** 真随机抽 5 只遭遇宝可梦（每次调用重抽，含切换场景/每轮演示） */
function pickFive<T>(pool: T[]): T[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 5);
}

/** 真随机从神兽池选 1 只（每次调用重选） */
function pickLegendary<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}
const isBlock = (k: ScriptLineKind) => BLOCK_KINDS.includes(k);

function AccentPath({ text, base }: { text: string; base: string }) {
  const m = /src\/[^\s（(]+/.exec(text);
  if (!m) return <span style={{ color: base }}>{text}</span>;
  const i = m.index;
  return (
    <span style={{ color: base }}>
      {text.slice(0, i)}
      <span style={{ color: "var(--sc-accent)" }}>{m[0]}</span>
      {text.slice(i + m[0].length)}
    </span>
  );
}

function ScriptRow({ line, symbol }: { line: ScriptLine; symbol: string }) {
  const { kind, text } = line;
  if (kind === "user") {
    return (
      <div className="tp-row">
        <span style={{ color: "var(--sc-prompt)" }}>{symbol} codex › </span>
        <span style={{ color: "var(--sc-fg)", fontWeight: 700 }}>{text}</span>
      </div>
    );
  }
  if (kind === "add" || kind === "del") {
    return (
      <div
        className="tp-row tp-diff"
        style={{
          background: kind === "add" ? "var(--sc-diff-add-bg)" : "var(--sc-diff-del-bg)",
          color: kind === "add" ? "var(--sc-diff-add-fg)" : "var(--sc-diff-del-fg)",
        }}
      >
        {text}
      </div>
    );
  }
  if (kind === "success") {
    return <div className="tp-row" style={{ color: "var(--sc-success)", fontWeight: 700 }}>{text}</div>;
  }
  if (kind === "ctx") {
    return <div className="tp-row" style={{ color: "var(--sc-output)" }}>{text}</div>;
  }
  if (kind === "think" || kind === "plan") {
    return (
      <div className="tp-row">
        <AccentPath text={text} base="var(--sc-fg-dim)" />
      </div>
    );
  }
  return <div className="tp-row" style={{ color: "var(--sc-fg-dim)" }}>{text}</div>;
}

type Phase = "banner" | "typing" | "hold" | "fade";

/**
 * 场景终端预览：打字机演示（横幅闪现 → 逐行打字 → 停 3s → 淡出重播）。
 * 与展示站 TerminalWindow 同逻辑，样式走 styles.css（无 Tailwind）。
 */
export default function TerminalPreview({ scene }: { scene: SceneDef }) {
  const timerRef = useRef<number | undefined>(undefined);
  const progRef = useRef<{ line: number; char: number; phase: Phase }>({ line: 0, char: 0, phase: "banner" });
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // 挂载时（含场景切换）真随机选定：神兽 1 只 + 遭遇 5 只
  const legendary = useMemo(
    () => pickLegendary(scene.legendaries.length ? scene.legendaries : scene.pokemon),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅场景变化时重选
    [scene.id],
  );
  const roster = useMemo(
    () => pickFive(scene.pokemon.slice(1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅场景变化时重抽
    [scene.id],
  );

  const [done, setDone] = useState<ScriptLine[]>([]);
  const [cur, setCur] = useState<ScriptLine | null>(null);
  const [fading, setFading] = useState(false);
  const [cycle, setCycle] = useState(0);

  const step = useCallback(() => {
    const p = progRef.current;
    const sc = sceneRef.current;
    const later = (ms: number) => {
      timerRef.current = window.setTimeout(step, ms);
    };
    if (p.phase === "banner") {
      p.phase = "typing";
      later(800);
      return;
    }
    if (p.phase === "typing") {
      const script = sc.script;
      if (p.line >= script.length) {
        p.phase = "hold";
        later(2600);
        return;
      }
      const l = script[p.line];
      if (isBlock(l.kind)) {
        setDone((d) => [...d, l]);
        p.line += 1;
        later(l.kind === "meta" ? 110 : 160);
        return;
      }
      p.char += 1;
      setCur({ kind: l.kind, text: l.text.slice(0, p.char) });
      if (p.char >= l.text.length) {
        setDone((d) => [...d, l]);
        setCur(null);
        p.line += 1;
        p.char = 0;
        later(200);
      } else {
        later(l.kind === "user" ? 22 : 15);
      }
      return;
    }
    if (p.phase === "hold") {
      p.phase = "fade";
      setFading(true);
      later(350);
      return;
    }
    setFading(false);
    setDone([]);
    setCur(null);
    p.line = 0;
    p.char = 0;
    p.phase = "banner";
    setCycle((c) => c + 1);
    later(350);
  }, []);

  /* 场景切换时重置并重播 */
  useEffect(() => {
    window.clearTimeout(timerRef.current);
    progRef.current = { line: 0, char: 0, phase: "banner" };
    setDone([]);
    setCur(null);
    setFading(false);
    timerRef.current = window.setTimeout(step, 250);
    return () => window.clearTimeout(timerRef.current);
  }, [scene, step]);

  return (
    <div className="tp" style={{ background: "var(--sc-panel)", borderColor: "var(--sc-border)" }}>
      <div className="tp-titlebar" style={{ borderColor: "var(--sc-border)" }}>
        <div className="tp-dots">
          <span style={{ background: "#F25757" }} />
          <span style={{ background: "#F5A623" }} />
          <span style={{ background: "#4CC38A" }} />
        </div>
        <span className="tp-title" style={{ color: "var(--sc-fg-dim)" }}>codex — 80×24</span>
        <span className="tp-scene-tag" style={{ color: "var(--sc-prompt)" }}>
          {scene.symbol} {scene.name}
        </span>
      </div>

      <div className="tp-screen" style={{ background: "var(--sc-inset)" }}>
        <div
          key={`${scene.id}-${cycle}`}
          className={`tp-body ${fading ? "tp-fading" : ""}`}
        >
          <div className="tp-banner-row">
            <img
              className="tp-mascot"
              src={POKEMON_ART[String(legendary.id)]?.full}
              alt={legendary.name}
            />
            <div className="tp-banner-side">
              <pre className="tp-banner">
                {scene.banner.map((line, i) =>
                  line === "stripe" ? (
                    <div key={i} className="tp-stripe" />
                  ) : (
                    <div key={i}>
                      {line.map((seg, j) => (
                        <span key={j} style={{ color: ROLE_COLOR[seg.r] }}>{seg.t}</span>
                      ))}
                    </div>
                  ),
                )}
              </pre>
              <div className="tp-roster">
                {roster.map((p) => (
                  <img
                    key={p.id}
                    src={POKEMON_ART[String(p.id)]?.half}
                    alt={p.name}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="tp-script">
            {done.map((l, i) => (
              <ScriptRow key={i} line={l} symbol={scene.symbol} />
            ))}
            {cur && <ScriptRow line={cur} symbol={scene.symbol} />}
            <span className="tp-cursor" style={{ color: "var(--sc-prompt)" }}>▌</span>
          </div>
        </div>
      </div>

      <div
        className="tp-statusbar"
        style={{ background: "var(--sc-status-bg)", color: "var(--sc-status-fg)" }}
      >
        <div className="tp-status-left">
          <span style={{ fontWeight: 700 }}>{scene.symbol} {scene.name}</span>
          <span className="tp-dim">branch: main</span>
        </div>
        <div className="tp-status-right">
          <span className="tp-dim">tokens: 12,408</span>
          <span><span style={{ color: "var(--sc-success)" }}>●</span> READY</span>
        </div>
      </div>
    </div>
  );
}
