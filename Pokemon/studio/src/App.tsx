import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { SHOP_SCENES, type ShopScene } from "./scenes";
import { SCENE_MAP, type SceneDef } from "./scene-data";
import TerminalPreview from "./TerminalPreview";

interface StudioStatus {
  platform: string;
  stateRoot: string;
  codexInstalled: boolean;
  nodeVersion: string | null;
  engineInstalled: boolean;
  injectorRunning: boolean;
  injectorPid: number | null;
  port: number | null;
  activeTheme: string | null;
  activeThemeName: string | null;
  paused: boolean;
  codexVersion: string | null;
  codexRunning: boolean;
}

type Phase =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "error"; text: string }
  | { kind: "ok"; text: string };

function StatusDot({ on, warn }: { on: boolean; warn?: boolean }) {
  return <span className={`dot ${on ? (warn ? "dot-warn" : "dot-on") : "dot-off"}`} />;
}

/* 浏览器 dev 预览（无 Tauri 后端）用的假数据，便于看完整商店 UI */
const DEMO_STATUS: StudioStatus = {
  platform: "macos",
  stateRoot: "~/Library/Application Support/CodexDreamSkinStudio (预览假数据)",
  codexInstalled: true,
  nodeVersion: "bundled (ChatGPT)",
  engineInstalled: true,
  injectorRunning: true,
  injectorPid: 12345,
  port: 9341,
  activeTheme: "pokemon-grassland",
  activeThemeName: "❀ 草原 · Grassland",
  paused: false,
  codexVersion: "150.0",
  codexRunning: true,
};

/** 场景 ui 色板 → --sc-* 变量（详情区整区换肤用） */
function sceneVars(s: SceneDef): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.ui)) out[`--sc-${k}`] = v;
  return out;
}

function SceneCard({
  scene,
  selected,
  active,
  onSelect,
}: {
  scene: ShopScene;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`shop-card ${selected ? "shop-card-selected" : ""}`}
      onClick={onSelect}
      style={{ ["--card-accent" as string]: scene.accent }}
    >
      <div className="shop-card-wall">
        <img src={scene.wallpaper} alt="" loading="lazy" />
        {active && <span className="shop-card-live">使用中</span>}
        <span className="shop-card-no">{scene.no}</span>
      </div>
      <div className="shop-card-body">
        <img className="shop-card-mascot" src={scene.mascot} alt="" loading="lazy" />
        <div className="shop-card-text">
          <span className="shop-card-name">
            <span className="shop-card-symbol">{scene.symbol}</span> {scene.name}
          </span>
          <span className="shop-card-en">{scene.en}</span>
          <span className="shop-card-tagline">{scene.tagline}</span>
        </div>
      </div>
      <div className="shop-card-swatches">
        {scene.swatches.map((c, i) => (
          <span key={i} style={{ background: c }} title={c} />
        ))}
      </div>
    </button>
  );
}

export default function App() {
  const inTauri = "__TAURI_INTERNALS__" in window;
  const [status, setStatus] = useState<StudioStatus | null>(inTauri ? null : DEMO_STATUS);
  const [phase, setPhase] = useState<Phase>(
    inTauri ? { kind: "idle" } : { kind: "ok", text: "浏览器预览模式：无 Tauri 后端，以下为假数据，「应用皮肤」不可用。" }
  );
  const [selectedId, setSelectedId] = useState("grassland");

  const refresh = useCallback(async () => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    try {
      setStatus(await invoke<StudioStatus>("get_status"));
    } catch (e) {
      setPhase({ kind: "error", text: String(e) });
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!("__TAURI_INTERNALS__" in window)) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const run = useCallback(
    async (text: string, action: () => Promise<string | void>) => {
      if (!("__TAURI_INTERNALS__" in window)) return; // 预览模式禁用操作
      setPhase({ kind: "busy", text });
      try {
        const out = await action();
        setPhase({ kind: "ok", text: out || "完成" });
      } catch (e) {
        setPhase({ kind: "error", text: String(e) });
      } finally {
        setTimeout(refresh, 600);
      }
    },
    [refresh]
  );

  const install = () =>
    run("正在安装 Dream Skin 引擎…", () => invoke<string>("install_engine"));

  const applyScene = (scene: ShopScene) =>
    run(`正在应用「${scene.name}」皮肤…`, async () => {
      const needRestart = !status?.injectorRunning;
      if (needRestart) {
        const yes = await confirm(
          "Codex 需要以调试模式重启一次才能注入皮肤（未保存的输入可能丢失）。继续？",
          { title: "启动皮肤引擎", kind: "warning" }
        );
        if (!yes) return "已取消";
      }
      const out = await invoke<string>("switch_scene", { sceneId: scene.packId });
      if (needRestart) {
        await invoke<string>("start_engine");
      }
      return out;
    });

  const restore = () =>
    run("正在恢复官方外观…", async () => {
      const yes = await confirm("恢复 Codex 官方外观并关闭皮肤引擎？", {
        title: "恢复官方",
        kind: "info",
      });
      if (!yes) return "已取消";
      return invoke<string>("stop_engine");
    });

  const verify = () => run("正在自检…", () => invoke<string>("verify_engine"));

  const togglePause = () =>
    run(status?.paused ? "正在恢复皮肤…" : "正在暂停皮肤…", async () => {
      await invoke("set_paused", { paused: !status?.paused });
    });

  const selected = SHOP_SCENES.find((s) => s.sceneId === selectedId) ?? SHOP_SCENES[0];
  const sceneDef: SceneDef = SCENE_MAP[selected.sceneId as keyof typeof SCENE_MAP];
  const vars = useMemo(() => sceneVars(sceneDef), [sceneDef]);

  if (!status) {
    return <div className="boot">正在扫描环境…</div>;
  }

  const ready = status.codexInstalled && status.nodeVersion !== null;
  const isActive = status.activeTheme === selected.packId;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-ball">🎨</span>
          <div>
            <h1>Codex 皮肤商店</h1>
            <p>DREAM SKIN STORE · 应用到 CODEX 桌面 APP</p>
          </div>
        </div>
        <div className="status-chips">
          <span className="chip">
            <StatusDot on={status.codexInstalled} /> Codex {status.codexVersion ?? ""}
          </span>
          <span className="chip">
            <StatusDot on={status.engineInstalled} /> 引擎
          </span>
          <span className="chip">
            <StatusDot on={status.injectorRunning} warn={status.paused} />
            {status.injectorRunning
              ? status.paused
                ? "已暂停"
                : `运行中 :${status.port}`
              : "未运行"}
          </span>
        </div>
      </header>

      {!ready && (
        <div className="banner banner-error">
          {!status.codexInstalled && <p>未检测到官方 Codex 桌面 App（Windows 商店包 OpenAI.Codex / macOS com.openai.codex）。</p>}
          {status.nodeVersion === null && status.platform === "windows" && (
            <p>未检测到 Node.js ≥ 22（引擎注入器需要）。</p>
          )}
        </div>
      )}

      {ready && !status.engineInstalled && (
        <div className="setup">
          <h2>首次使用 · 安装皮肤引擎</h2>
          <p>
            将官方 Dream Skin 引擎安装到本机（不修改 Codex App 本体，CDP 只绑 127.0.0.1，可随时一键恢复）。
            安装前请先<b>完全退出 Codex</b>。
          </p>
          {status.codexRunning ? (
            <p className="warn">⚠ 检测到 Codex 正在运行 —— 请先完全退出 Codex，再安装引擎。</p>
          ) : (
            <button className="btn btn-primary" onClick={install} disabled={phase.kind === "busy"}>
              安装引擎
            </button>
          )}
        </div>
      )}

      <main className="shop">
          <section className="shop-grid">
            <div className="shop-grid-head">
              <h2>宝可梦栖息地系列</h2>
              <span className="shop-count">{SHOP_SCENES.length} 款皮肤</span>
            </div>
            <div className="shop-cards">
              {SHOP_SCENES.map((s) => (
                <SceneCard
                  key={s.packId}
                  scene={s}
                  selected={s.sceneId === selected.sceneId}
                  active={status.activeTheme === s.packId}
                  onSelect={() => setSelectedId(s.sceneId)}
                />
              ))}
            </div>
          </section>

          <section className="detail" style={vars as React.CSSProperties}>
            <div className="detail-wall">
              <img src={selected.wallpaper} alt={`${selected.name}壁纸`} />
              <div className="detail-wall-overlay">
                <span className="detail-no">{selected.no}</span>
                <h2>
                  {selected.symbol} {selected.name}
                  <span className="detail-en">{selected.en}</span>
                </h2>
                <p>{selected.flavor}</p>
              </div>
            </div>

            <div className="detail-body">
              <div className="detail-preview">
                <TerminalPreview scene={sceneDef} />
              </div>

              <aside className="detail-side">
                <p className="detail-desc">{selected.desc}</p>

                <div className="detail-block">
                  <h3>出没宝可梦</h3>
                  <div className="detail-pokemon">
                    {selected.encounters.map((p) => (
                      <span key={p.id} className="poke-chip" title={p.name}>
                        {p.sprite && <img src={p.sprite} alt={p.name} loading="lazy" />}
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="detail-block">
                  <h3>ANSI 16 色</h3>
                  <div className="detail-ansi">
                    {selected.ansi.map((c, i) => (
                      <span key={i} style={{ background: c }} title={c} />
                    ))}
                  </div>
                </div>

                <div className="detail-keywords">
                  {selected.keywords.map((k) => (
                    <span key={k}>{k}</span>
                  ))}
                </div>

                <div className="detail-actions">
                  {status.engineInstalled ? (
                    <button
                      className="btn btn-primary btn-apply"
                      onClick={() => applyScene(selected)}
                      disabled={phase.kind === "busy" || (isActive && status.injectorRunning && !status.paused)}
                    >
                      {isActive ? "✓ 当前皮肤" : `应用「${selected.name}」到桌面 App`}
                    </button>
                  ) : (
                    <button className="btn btn-primary btn-apply" disabled title="安装引擎后可一键应用">
                      安装引擎后可一键应用
                    </button>
                  )}
                  <div className="detail-actions-row">
                    <button className="btn" onClick={togglePause} disabled={phase.kind === "busy" || !status.injectorRunning}>
                      {status.paused ? "恢复皮肤" : "暂停皮肤"}
                    </button>
                    <button className="btn" onClick={verify} disabled={phase.kind === "busy" || !status.injectorRunning}>
                      自检
                    </button>
                    <button className="btn btn-danger" onClick={restore} disabled={phase.kind === "busy" || !status.engineInstalled}>
                      恢复官方
                    </button>
                  </div>
                  {status.activeThemeName && (
                    <span className="detail-current">当前桌面 App 皮肤：{status.activeThemeName}</span>
                  )}
                </div>
              </aside>
            </div>
          </section>
        </main>

      <footer className="shop-footer">
        <span>皮肤引擎：Codex-Dream-Skin 1.2.0（MIT，vendor 随应用分发）· 注入不修改 Codex 本体，CDP 仅绑 127.0.0.1，可随时恢复官方外观</span>
      </footer>

      {phase.kind !== "idle" && (
        <div
          className={`toast toast-${phase.kind}`}
          onClick={() => phase.kind !== "busy" && setPhase({ kind: "idle" })}
        >
          {phase.kind === "busy" ? "⏳ " : phase.kind === "error" ? "⚠ " : "✓ "}
          {phase.text}
        </div>
      )}
    </div>
  );
}
