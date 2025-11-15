import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Cpu, MessageSquare, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/gpu-status', icon: Cpu, label: 'GPU Status' },
  { path: '/assistant', icon: MessageSquare, label: 'AI Assistant' },
];

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-dark border-r border-dark-border/20 flex flex-col h-screen sticky top-0"
    >
      {/* Logo */}
      <div className="p-6 border-b border-dark-border/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D65737] rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-light text-text-primary">RivannaAI</h1>
            <p className="text-xs text-text-secondary/70 font-light">HPC Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#D65737]/15 text-[#D65737] font-light'
                  : 'text-text-secondary/80 hover:text-text-primary hover:bg-dark-border/20'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4 h-4 ${isActive ? 'text-[#D65737]' : ''}`} />
                <span className="text-sm font-light">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-border/20">
        <div className="text-xs text-text-muted/70 space-y-2">
          <div className="flex items-center justify-between">
            <span>status</span>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-green-400/80 text-[0.65rem]">live</span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>version</span>
            <span className="text-text-secondary/60 text-[0.65rem]">v1.0.0</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
