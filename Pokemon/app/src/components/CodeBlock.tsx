import CopyButton from './CopyButton';
import { cn } from '@/lib/utils';

/**
 * 代码块（design.md §6.5）：头部 = 语言标签 + 文件名 + CopyButton；
 * 正文 JetBrains Mono，长句不折行横向滚动。hover 边框变 --sc-accent。
 */
export default function CodeBlock({
  code,
  lang = 'bash',
  filename,
  className,
}: {
  code: string;
  lang?: string;
  filename?: string;
  className?: string;
}) {
  return (
    <div
      className={cn('pixel-corners group border transition-colors duration-200', className)}
      style={{ background: 'var(--sc-inset)', borderColor: 'var(--sc-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--sc-accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--sc-border)'; }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-3 py-1.5"
        style={{ borderColor: 'var(--sc-border)' }}
      >
        <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
          <span
            className="px-1.5 py-0.5"
            style={{ background: 'var(--sc-panel)', color: 'var(--sc-accent)' }}
          >
            {lang}
          </span>
          {filename && (
            <span className="truncate" style={{ color: 'var(--sc-fg-dim)' }}>{filename}</span>
          )}
        </div>
        <CopyButton text={code} />
      </div>
      <pre
        className="overflow-x-auto p-3 font-mono text-sm leading-relaxed"
        style={{ color: 'var(--sc-output)' }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
