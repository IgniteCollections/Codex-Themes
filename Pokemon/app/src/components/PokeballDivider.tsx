import { motion } from 'framer-motion';

/** 精灵球分隔带：────── ◓ ──────（进入视口时 ◓ 旋转 360° 一次） */
export default function PokeballDivider() {
  return (
    <div
      aria-hidden
      className="flex select-none items-center justify-center gap-4 py-4 font-mono text-sm"
      style={{ color: 'var(--sc-fg-dim)' }}
    >
      <span className="tracking-widest">──────────</span>
      <motion.span
        initial={{ rotate: 0 }}
        whileInView={{ rotate: 360 }}
        viewport={{ once: true, margin: '-20% 0px' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="inline-block text-base"
        style={{ color: 'var(--brand)' }}
      >
        ◓
      </motion.span>
      <span className="tracking-widest">──────────</span>
    </div>
  );
}
