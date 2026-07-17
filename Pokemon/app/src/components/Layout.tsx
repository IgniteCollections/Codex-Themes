import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import Lenis from 'lenis';
import Navbar from './Navbar';
import Footer from './Footer';
import CustomCursor from './CustomCursor';

/**
 * 全站布局（children 模式 — App.tsx 用 <Layout><Routes>…</Routes></Layout>）。
 * Navbar 为 sticky 正常文档流，页面无需补偿导航高度。
 * 内含 Lenis 平滑滚动（lerp 0.1）与路由切换回顶。
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  /* Lenis 平滑滚动 */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.1 });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  /* 路由切换回顶 */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <CustomCursor />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
