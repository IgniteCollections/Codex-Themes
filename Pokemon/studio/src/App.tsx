import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { SCENES } from "./scenes";

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
}

type Phase =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "error"; text: string }
  | { kind: "ok"; text: string };

function StatusDot({ on, warn }: { on: boolean; warn?: boolean }) {
  return <span className={`dot ${on ? (warn ? "dot-warn" : "dot-on") : "dot-off"}`} />;
}

export default function App() {
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const refresh = useCallback(async () => {
    try {
      setStatus(await invoke<StudioStatus>("get_status"));
    } catch (e) {
      setPhase({ kind: "error", text: String(e) });
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const run = useCallback(
    async (text: string, action: () => Promise<string | void>) => {
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

  const switchTo = (sceneId: string) =>
    run(`正在切换场景…`, async () => {
      if (!status?.injectorRunning) {
        const yes = await confirm(
          "Codex 需要以调试模式重启一次才能注入皮肤（未保存的输入可能丢失）。继续？",
          { title: "启动皮肤引擎", kind: "warning" }
        );
        if (!yes) return "已取消";
      }
      const out = await invoke<string>("switch_scene", { sceneId });
      if (!status?.injectorRunning) {
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

  if (!status) {
    return <div className="boot">正在扫描环境…</div>;
  }

  const ready = status.codexInstalled && status.nodeVersion !== null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-ball">◓</span>
          <div>
            <h1>宝可梦皮肤工作室</h1>
            <p>CODEX × POKÉMON · Dream Skin 引擎</p>
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
          <button className="btn btn-primary" onClick={install} disabled={phase.kind === "busy"}>
            安装引擎
          </button>
        </div>
      )}

      {status.engineInstalled && (
        <>
          <section className="scene-grid">
            {SCENES.map((s) => {
              const active = status.activeTheme === s.id;
              return (
                <button
                  key={s.id}
                  className={`scene-card ${active ? "scene-active" : ""}`}
                  onClick={() => switchTo(s.id)}
                  disabled={phase.kind === "busy"}
                >
                  <img className="scene-mascot" src={s.sprite} alt="" loading="lazy" />
                  <span className="scene-symbol">{s.symbol}</span>
                  <span className="scene-name">{s.label}</span>
                  <span className="scene-en">{s.en}</span>
                  <span className="scene-flavor">{s.flavor}</span>
                  {active && <span className="scene-badge">使用中</span>}
                </button>
              );
            })}
          </section>

          <footer className="actions">
            <button className="btn" onClick={togglePause} disabled={phase.kind === "busy" || !status.injectorRunning}>
              {status.paused ? "恢复皮肤" : "暂停皮肤"}
            </button>
            <button className="btn" onClick={verify} disabled={phase.kind === "busy" || !status.injectorRunning}>
              自检
            </button>
            <button className="btn btn-danger" onClick={restore} disabled={phase.kind === "busy"}>
              恢复官方
            </button>
            {status.activeThemeName && (
              <span className="current">当前：{status.activeThemeName}</span>
            )}
          </footer>
        </>
      )}

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
