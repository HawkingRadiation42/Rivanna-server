import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Server, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import { clusterAPI } from '../utils/api';
import type { GPUStatsResponse, GPUQueueResponse, GPUJob } from '../types';

export default function GPUStatus() {
  const [gpuStats, setGpuStats] = useState<GPUStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGPU, setExpandedGPU] = useState<string | null>(null);
  const [queueData, setQueueData] = useState<Record<string, GPUQueueResponse>>({});
  const [loadingQueue, setLoadingQueue] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchGPUStats();
    const interval = setInterval(fetchGPUStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchGPUStats = async () => {
    try {
      const data = await clusterAPI.getGPUStats();
      setGpuStats(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch GPU stats:', err);
      setError('Unable to connect to the HPC server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGPUQueue = async (gpuType: string) => {
    // Map display names to API endpoints
    const gpuTypeMap: Record<string, string> = {
      'H200': 'h200',
      'A6000': 'a6000',
      'A40': 'a40',
      'V100': 'v100',
      'A100': 'a100',
      'RTX3090': '3090',
      'RTX2080Ti': '2080ti',
    };

    const apiType = gpuTypeMap[gpuType] || gpuType.toLowerCase();

    setLoadingQueue(prev => ({ ...prev, [gpuType]: true }));
    try {
      const data = await clusterAPI.getGPUQueue(apiType);
      setQueueData(prev => ({ ...prev, [gpuType]: data }));
    } catch (err) {
      console.error(`Failed to fetch queue for ${gpuType}:`, err);
    } finally {
      setLoadingQueue(prev => ({ ...prev, [gpuType]: false }));
    }
  };

  const toggleGPU = (gpuType: string) => {
    if (expandedGPU === gpuType) {
      setExpandedGPU(null);
    } else {
      setExpandedGPU(gpuType);
      // Fetch queue data if not already loaded
      if (!queueData[gpuType]) {
        fetchGPUQueue(gpuType);
      }
    }
  };

  // Extract TRES info (GPU count from tres_per_node field)
  const extractGPUCount = (tresPerNode: string): string => {
    const match = tresPerNode.match(/gpu:[^:]*:(\d+)/);
    return match ? match[1] : 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading GPU status...</p>
        </div>
      </div>
    );
  }

  if (error || !gpuStats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Connection Error</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button onClick={fetchGPUStats} className="btn-primary">
            Retry Connection
          </button>
          <p className="text-xs text-text-muted mt-4">
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
      >
        <h1 className="text-3xl font-bold text-text-primary mb-2">GPU Status</h1>
        <p className="text-text-secondary">Real-time GPU availability and queue information</p>
      </motion.div>

      {/* Overall GPU Statistics Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="card bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Overall GPU Statistics</h2>
            <p className="text-sm text-text-secondary">Cluster-wide GPU utilization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-text-secondary text-sm mb-1">Total GPUs</p>
            <p className="text-3xl font-bold text-text-primary">{gpuStats.overall.total_gpus}</p>
          </div>
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-text-secondary text-sm mb-1">In Use</p>
            <p className="text-3xl font-bold text-blue-400">{gpuStats.overall.gpus_in_use}</p>
          </div>
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-text-secondary text-sm mb-1">Available</p>
            <p className="text-3xl font-bold text-green-400">{gpuStats.overall.gpus_free}</p>
          </div>
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-text-secondary text-sm mb-1">Utilization</p>
            <p className="text-3xl font-bold text-purple-400">{gpuStats.overall.utilization_percent.toFixed(1)}%</p>
          </div>
        </div>

        {/* Overall Utilization Bar */}
        <div>
          <div className="flex justify-between text-xs text-text-secondary mb-2">
            <span>Cluster GPU Utilization</span>
            <span>{gpuStats.overall.utilization_percent.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
              style={{ width: `${gpuStats.overall.utilization_percent}%` }}
            ></div>
          </div>
        </div>
      </motion.div>

      {/* GPU Types List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          GPU Types
        </h2>

        {gpuStats.gpu_types
          .filter(gpu => gpu.type !== 'a100' || gpu.type === 'a100') // Show only A100-80GB (filter handled in backend)
          .map((gpu, index) => (
          <motion.div
            key={gpu.type}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            className="card-hover"
          >
            {/* GPU Type Card */}
            <div
              onClick={() => toggleGPU(gpu.type.toUpperCase())}
              className="cursor-pointer p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary uppercase">
                      {gpu.type}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {gpu.total} total GPUs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-text-secondary">In Use / Available</p>
                    <p className="text-lg font-semibold text-text-primary">
                      <span className="text-blue-400">{gpu.in_use}</span>
                      {' / '}
                      <span className="text-green-400">{gpu.free}</span>
                    </p>
                  </div>
                  {expandedGPU === gpu.type.toUpperCase() ? (
                    <ChevronUp className="w-5 h-5 text-text-secondary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-secondary" />
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="bg-dark/50 rounded-lg p-3">
                  <p className="text-xs text-text-secondary mb-1">Total</p>
                  <p className="text-xl font-bold text-text-primary">{gpu.total}</p>
                </div>
                <div className="bg-dark/50 rounded-lg p-3">
                  <p className="text-xs text-text-secondary mb-1">In Use</p>
                  <p className="text-xl font-bold text-blue-400">{gpu.in_use}</p>
                </div>
                <div className="bg-dark/50 rounded-lg p-3">
                  <p className="text-xs text-text-secondary mb-1">Available</p>
                  <p className="text-xl font-bold text-green-400">{gpu.free}</p>
                </div>
                <div className="bg-dark/50 rounded-lg p-3">
                  <p className="text-xs text-text-secondary mb-1">Utilization</p>
                  <p className="text-xl font-bold text-purple-400">{gpu.utilization_percent.toFixed(1)}%</p>
                </div>
              </div>

              {/* Utilization Bar */}
              <div>
                <div className="h-2 bg-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                    style={{ width: `${gpu.utilization_percent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Expandable Queue Section */}
            <AnimatePresence>
              {expandedGPU === gpu.type.toUpperCase() && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden border-t border-dark"
                >
                  <div className="p-5 bg-dark/30">
                    <h4 className="text-md font-semibold text-text-primary mb-4 flex items-center gap-2">
                      <Server className="w-4 h-4 text-purple-400" />
                      Job Queue ({queueData[gpu.type.toUpperCase()]?.job_count || 0} jobs)
                    </h4>

                    {loadingQueue[gpu.type.toUpperCase()] ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-text-secondary text-sm">Loading queue...</p>
                      </div>
                    ) : queueData[gpu.type.toUpperCase()]?.jobs.length === 0 ? (
                      <div className="text-center py-8">
                        <Server className="w-12 h-12 text-text-muted mx-auto mb-2" />
                        <p className="text-text-secondary">No jobs in queue</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-dark">
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">Job ID</th>
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">User</th>
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">Job Name</th>
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">State</th>
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">GPUs</th>
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">Time Used</th>
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">Time Limit</th>
                              <th className="text-left py-3 px-2 text-text-secondary font-semibold">Nodes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {queueData[gpu.type.toUpperCase()]?.jobs.map((job: GPUJob) => (
                              <tr key={job.job_id} className="border-b border-dark/50 hover:bg-dark/50 transition-colors">
                                <td className="py-3 px-2 font-mono text-accent">{job.job_id}</td>
                                <td className="py-3 px-2 text-text-primary flex items-center gap-1">
                                  <User className="w-3 h-3 text-text-secondary" />
                                  {job.user}
                                </td>
                                <td className="py-3 px-2 text-text-primary">{job.name}</td>
                                <td className="py-3 px-2">
                                  <span className={`badge ${
                                    job.state === 'R' ? 'bg-green-500/20 text-green-400' :
                                    job.state === 'PD' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {job.state}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-text-primary font-semibold">
                                  {extractGPUCount(job.tres_per_node)}
                                </td>
                                <td className="py-3 px-2 text-text-primary flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-text-secondary" />
                                  {job.time_used}
                                </td>
                                <td className="py-3 px-2 text-text-secondary">{job.time_limit}</td>
                                <td className="py-3 px-2 text-text-primary font-mono text-xs">{job.nodelist}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
