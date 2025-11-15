import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { motion } from 'framer-motion';

export default function Layout() {
  return (
    <div className="flex h-screen bg-dark overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-y-auto bg-dark"
        style={{ backgroundColor: '#000000' }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
