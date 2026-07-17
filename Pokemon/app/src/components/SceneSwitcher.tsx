import { useCallback } from 'react';
import { SCENES } from '@/themes/scenes';
import { useScene } from '@/themes/SceneProvider';
import { cn } from '@/lib/utils';

/**
 * SceneSwitcher（design.md §6.3）：6 枚 44x44 像素图标按钮。
 * 激活态：边框变场景色 + translateY(-4px) + 底部 4px 场景色方块条；
 * hover：图标 2px 抖动（steps(2)）；下方 tooltip 场景名；
 * 左右方向键循环切换；换肤动画期间禁用防连点。
 */
export default function SceneSwitcher({ className }: { className?: string }) {
  const { sceneId, switching, switchScene } = useScene();

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const idx = SCENES.findIndex((s) => s.id === sceneId);
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = SCENES[(idx + dir + SCENES.length) % SCENES.length];
      switchScene(next.id);
    },
    [sceneId, switchScene],
  );

  return (
    <div
      role="group"
      aria-label="选择栖息地"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn('flex items-center gap-3 outline-none', className)}
    >
      {SCENES.map((s, i) => {
        const active = s.id === sceneId;
        return (
          <div key={s.id} className="group relative flex flex-col items-center">
            <button
              type="button"
              aria-label={s.name}
              aria-pressed={active}
              disabled={switching}
              onClick={() => switchScene(s.id)}
              className={cn(
                'glass pixel-corners flex h-11 w-11 items-center justify-center border transition-all duration-200',
                'disabled:cursor-not-allowed disabled:opacity-60',
                active && '-translate-y-1',
              )}
              style={{
                borderColor: active ? s.ui.prompt : 'color-mix(in srgb, var(--sc-fg) 10%, transparent)',
                animation: `scale-in .35s ${0.05 * i + 0.4}s cubic-bezier(.34,1.56,.64,1) backwards`,
              }}
            >
              <img
                src={s.icon}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 transition-transform group-hover:animate-[pixel-bob_.4s_steps(2)_infinite]"
                style={{ imageRendering: 'pixelated' }}
              />
            </button>
            {/* 激活态底部 4px 方块条 */}
            <span
              className="mt-1 h-1 w-4 transition-opacity duration-200"
              style={{ background: s.ui.prompt, opacity: active ? 1 : 0 }}
            />
            {/* tooltip */}
            <span
              className="pointer-events-none absolute -bottom-7 whitespace-nowrap rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              style={{ background: 'var(--sc-panel)', color: 'var(--sc-fg)', border: '1px solid var(--sc-border)' }}
            >
              {s.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
