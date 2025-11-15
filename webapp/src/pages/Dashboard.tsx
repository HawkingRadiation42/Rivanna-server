import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, Activity, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import { clusterAPI } from '../utils/api';
import { calculateClusterStats } from '../utils/helpers';
import type { Node, Job } from '../types';

export default function Dashboard() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [nodesData, jobsData] = await Promise.all([
        clusterAPI.getNodes(),
        clusterAPI.getJobs(),
      ]);
      setNodes(nodesData.nodes);
      setJobs(jobsData.jobs);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Unable to connect to the HPC server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateClusterStats(nodes);
  const runningJobs = jobs.filter(j => j.state === 'R').length;
  const pendingJobs = jobs.filter(j => j.state === 'PD').length;

  // Mock data for charts - in production, this would come from time-series data
  const cpuTrendData = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    usage: 40 + Math.random() * 30,
  }));

  const jobsDistribution = [
    { name: 'Running', value: runningJobs, color: '#3b82f6' },
    { name: 'Pending', value: pendingJobs, color: '#eab308' },
    { name: 'Completed', value: jobs.filter(j => j.state === 'CG').length, color: '#22c55e' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#D65737]/30 border-t-[#D65737] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary/70 font-light">Loading cluster data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-red-400/80" />
          </div>
          <h2 className="text-xl font-light text-text-primary mb-2">Connection Error</h2>
          <p className="text-text-secondary/70 mb-6 font-light">{error}</p>
          <button onClick={fetchData} className="btn-primary">
            Retry Connection
          </button>
          <p className="text-xs text-text-muted/70 mt-4 font-light">
            Make sure the backend server is running at http://localhost:8000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-dark min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-extralight text-text-primary mb-1">Cluster Overview</h1>
          <p className="text-text-secondary/70 font-light">Real-time monitoring and insights</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-dark-lighter rounded-lg border border-dark-border/20">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-text-secondary/70 font-light">Live</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total CPUs"
          value={stats.totalCPUs}
          icon={Cpu}
          subtitle={`${stats.idleCPUs} idle • ${stats.allocCPUs} allocated`}
          delay={0}
        />
        <StatCard
          title="CPU Utilization"
          value={`${stats.cpuUtilization}%`}
          icon={TrendingUp}
          subtitle="Average across cluster"
          trend={{ value: 5.2, isPositive: true }}
          delay={0.1}
        />
        <StatCard
          title="Total Nodes"
          value={stats.totalNodes}
          icon={HardDrive}
          subtitle={`${stats.idleNodes} idle nodes`}
          delay={0.2}
        />
        <StatCard
          title="Active Jobs"
          value={runningJobs}
          icon={Activity}
          subtitle={`${pendingJobs} pending`}
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU Trend */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 card-hover p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-light text-text-primary">CPU Usage Trend</h3>
              <p className="text-sm text-text-secondary/70 font-light">Last 20 intervals</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extralight text-[#D65737]">{stats.cpuUtilization}%</div>
              <div className="text-xs text-text-secondary/70 font-light">Current</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cpuTrendData}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D65737" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#D65737" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '6px',
                  color: '#d1d0c5',
                }}
              />
              <Area
                type="monotone"
                dataKey="usage"
                stroke="#D65737"
                strokeWidth={1.5}
                fill="url(#cpuGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Jobs Distribution */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="card-hover p-6"
        >
          <h3 className="text-lg font-light text-text-primary mb-6">Jobs Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={jobsDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {jobsDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  color: '#d1d0c5',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {jobsDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-text-secondary/70 font-light">{item.name}</span>
                </div>
                <span className="text-text-primary font-light">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Jobs Table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="card-hover p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-light text-text-primary">Recent Jobs</h3>
            <p className="text-sm text-text-secondary/70 font-light">Latest job submissions</p>
          </div>
          <button className="btn-secondary text-sm">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border/20">
                <th className="text-left py-3 px-4 text-xs font-light text-text-secondary/70 uppercase">Job ID</th>
                <th className="text-left py-3 px-4 text-xs font-light text-text-secondary/70 uppercase">Name</th>
                <th className="text-left py-3 px-4 text-xs font-light text-text-secondary/70 uppercase">Partition</th>
                <th className="text-left py-3 px-4 text-xs font-light text-text-secondary/70 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-light text-text-secondary/70 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-light text-text-secondary/70 uppercase">Runtime</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 8).map((job) => (
                <tr key={job.id} className="border-b border-dark-border/10 hover:bg-dark-border/10 transition-colors">
                  <td className="py-3 px-4 text-sm font-mono text-[#D65737]/80">{job.id}</td>
                  <td className="py-3 px-4 text-sm text-text-primary font-light truncate max-w-[200px]">{job.name}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary/70 font-light">{job.partition}</td>
                  <td className="py-3 px-4 text-sm text-text-secondary/70 font-light">{job.user}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${job.state === 'R' ? 'status-alloc' : job.state === 'PD' ? 'status-mix' : 'status-idle'}`}>
                      {job.state}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-text-secondary/70 font-light font-mono">{job.runtime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
