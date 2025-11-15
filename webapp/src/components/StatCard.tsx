import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
}

export default function StatCard({ title, value, icon: Icon, subtitle, trend, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="card-hover"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-secondary/70 text-xs font-light mb-3">{title.toUpperCase()}</p>
          <h3 className="text-4xl font-extralight text-text-primary mb-2">{value}</h3>
          {subtitle && <p className="text-text-secondary/60 text-xs font-light">{subtitle}</p>}
          {trend && (
            <div className={`text-xs mt-3 font-light ${trend.isPositive ? 'text-green-400/80' : 'text-red-400/80'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-[#D65737]/10 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#D65737]" />
        </div>
      </div>
    </motion.div>
  );
}
