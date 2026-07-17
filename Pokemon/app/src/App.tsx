import { Routes, Route } from 'react-router';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Scenes from '@/pages/Scenes';
import Install from '@/pages/Install';

/* children 模式：Layout 渲染 {children}，App 用 <Layout><Routes>…</Routes></Layout> */
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scenes" element={<Scenes />} />
        <Route path="/install" element={<Install />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
