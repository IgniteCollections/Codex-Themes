import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'accent' | 'ghost';

/**
 * 像素按钮（design.md §6.6）
 * primary = 品牌红底白字 / accent = 场景强调底 / ghost = 透明底 1px 边框
 * hover: translate(-2px,-2px) + 影扩 6px；active 回落
 */
export default function PixelButton({
  variant = 'primary',
  className,
  children,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      {...rest}
      className={cn(
        'pixel-corners inline-flex select-none items-center justify-center gap-2 px-6 py-3',
        'font-display text-base tracking-wide transition-all duration-150',
        'shadow-pixel hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pixel-lg',
        'active:translate-x-0 active:translate-y-0 active:shadow-pixel',
        variant === 'ghost' && 'border bg-transparent',
        className,
      )}
      style={{
        ...(variant === 'primary'
          ? { background: 'var(--brand)', color: '#fff' }
          : variant === 'accent'
            ? { background: 'var(--sc-prompt)', color: 'var(--sc-inset)' }
            : { borderColor: 'var(--sc-border)', color: 'var(--sc-fg)' }),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
