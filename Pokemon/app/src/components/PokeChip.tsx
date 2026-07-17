import type { Pokemon } from '@/themes/scenes';

/** 出没宝可梦标签（design.md §6.6）：8px 像素圆点 + 中文名 + 属性小字，玻璃底 */
export default function PokeChip({ pokemon }: { pokemon: Pokemon }) {
  return (
    <span className="glass inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: 'var(--sc-prompt)' }}
      />
      <span className="text-sm leading-none" style={{ color: 'var(--sc-fg)' }}>
        {pokemon.name}
      </span>
      <span className="font-mono text-[10px] leading-none" style={{ color: 'var(--sc-fg-dim)' }}>
        {pokemon.types.join('/')}
      </span>
    </span>
  );
}
