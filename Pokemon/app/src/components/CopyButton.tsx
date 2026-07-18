import { useRef, useState } from 'react';
import { useScene } from '@/themes/use-scene';
import { cn } from '@/lib/utils';

/**
 * 一键复制（design.md §6.5）：⧉ 复制 → ✔ 已复制（场景成功色）1.8s
 * 同时右下角 toast「已复制到剪贴板！」
 */
export default function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const { notify } = useScene();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    window.clearTimeout(timer.current);
    setCopied(true);
    notify('已复制到剪贴板！', '✔');
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn('pixel-corners border px-2.5 py-1 font-mono text-xs transition-colors', className)}
      style={{
        borderColor: 'var(--sc-border)',
        color: copied ? 'var(--sc-success)' : 'var(--sc-fg-dim)',
        background: 'transparent',
      }}
    >
      {copied ? '✔ 已复制' : '⧉ 复制'}
    </button>
  );
}
