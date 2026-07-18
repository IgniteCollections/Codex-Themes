import type { Pokemon } from '@/themes/scenes';
import { pokemonSprite } from '@/themes/scenes';

/** 出没宝可梦标签（design.md §6.6）：Gen III sprite + 中文名 + 属性小字，玻璃底 */
export default function PokeChip({ pokemon }: { pokemon: Pokemon }) {
  return (
    <span className="glass inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1">
      <img
        src={pokemonSprite(pokemon)}
        alt={pokemon.name}
        className="h-6 w-6 object-contain"
        style={{ imageRendering: 'pixelated' }}
        loading="lazy"
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
