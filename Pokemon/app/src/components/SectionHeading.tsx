/** SectionHeading（design.md §6.6）：Pixel Label 英文小字 + 黄油体中文大标题 + ◓ 装饰 */
export default function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-12 flex items-end justify-between gap-6">
      <div>
        <p className="pixel-label mb-3" style={{ color: 'var(--sc-accent)' }}>
          {label}
        </p>
        <h2
          className="font-display text-3xl leading-tight tracking-wide md:text-4xl"
          style={{ color: 'var(--sc-fg)' }}
        >
          {title}
        </h2>
      </div>
      <span
        aria-hidden
        className="mb-1 hidden shrink-0 text-3xl sm:block"
        style={{ color: 'var(--brand)' }}
      >
        ◓
      </span>
    </div>
  );
}
