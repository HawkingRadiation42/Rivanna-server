import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, HardDrive, Search, Filter, Zap } from 'lucide-react';
import { clusterAPI } from '../utils/api';
import { getNodeStatusColor, formatBytes } from '../utils/helpers';
import type { Node } from '../types';

export default function GPUStatus() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPartition, setFilterPartition] = useState('all');

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 12000);
    return () => clearInterval(interval);
  }, []);

  const fetchNodes = async () => {
    try {
      const data = await clusterAPI.getNodes();
      setNodes(data.nodes);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
      setError('Unable to connect to the HPC server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const partitions = Array.from(new Set(nodes.map(n => n.partition)));

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.partition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPartition = filterPartition === 'all' || node.partition === filterPartition;
    return matchesSearch && matchesPartition;
  });

  const gpuNodes = filteredNodes.filter(n => n.gres && n.gres.includes('gpu'));
  const regularNodes = filteredNodes.filter(n => !n.gres || !n.gres.includes('gpu'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading node status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Connection Error</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button onClick={fetchNodes} className="btn-primary">
            Retry Connection
          </button>
          <p className="text-xs text-text-muted mt-4">
            Make sure the backend server is running at http://localhost:8000
          </p>
        </div>
      </div>
    );
  }

  const NodeCard = ({ node }: { node: Node }) => (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      className="card-hover p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            node.gres?.includes('gpu') ? 'bg-purple-500/10' : 'bg-blue-500/10'
          }`}>
            {node.gres?.includes('gpu') ? (
              <Zap className="w-5 h-5 text-purple-400" />
            ) : (
              <Server className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{node.name}</h3>
            <p className="text-xs text-text-secondary">{node.partition}</p>
          </div>
        </div>
        <span className={`badge ${getNodeStatusColor(node.state)}`}>
          {node.state}
        </span>
      </div>

      <div className="space-y-3">
        {/* CPU Usage Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-text-secondary flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              CPU
            </span>
            <span className="text-text-primary font-mono">
              {node.cpusA}/{node.cpusT}
            </span>
          </div>
          <div className="h-2 bg-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
              style={{ width: `${(node.cpusA / node.cpusT) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-text-muted">Idle: {node.cpusI}</span>
            <span className="text-text-muted">
              {((node.cpusA / node.cpusT) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Memory */}
        <div className="flex items-center justify-between py-2 px-3 bg-dark rounded-lg">
          <span className="text-xs text-text-secondary flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            Memory
          </span>
          <span className="text-xs text-text-primary font-mono">
            {formatBytes(node.mem_mb)}
          </span>
        </div>

        {/* GPU Info */}
        {node.gres && node.gres !== 'N/A' && (
          <div className="flex items-center justify-between py-2 px-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              GPU
            </span>
            <span className="text-xs text-purple-300 font-mono">
              {node.gres}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="p-8 space-y-8 bg-dark min-h-screen" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="text-3xl font-bold text-text-primary mb-2">Node Status</h1>
        <p className="text-text-secondary">Detailed view of cluster nodes and GPU availability</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <select
            value={filterPartition}
            onChange={(e) => setFilterPartition(e.target.value)}
            className="input pl-10 pr-4 appearance-none cursor-pointer"
          >
            <option value="all">All Partitions</option>
            {partitions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="card bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">GPU Nodes</p>
              <p className="text-2xl font-bold text-purple-400">{gpuNodes.length}</p>
            </div>
            <Zap className="w-8 h-8 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="card bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Idle Nodes</p>
              <p className="text-2xl font-bold text-green-400">
                {filteredNodes.filter(n => n.state.toLowerCase() === 'idle').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Allocated</p>
              <p className="text-2xl font-bold text-blue-400">
                {filteredNodes.filter(n => n.state.toLowerCase() === 'alloc').length}
              </p>
            </div>
            <Server className="w-8 h-8 text-blue-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="card bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Mixed</p>
              <p className="text-2xl font-bold text-yellow-400">
                {filteredNodes.filter(n => n.state.toLowerCase() === 'mix').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* GPU Nodes Section */}
      {gpuNodes.length > 0 && (
        <div>
          <motion.h2
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2"
          >
            <Zap className="w-5 h-5 text-purple-400" />
            GPU Nodes
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gpuNodes.map((node) => (
              <NodeCard key={node.name} node={node} />
            ))}
          </div>
        </div>
      )}

      {/* Regular Nodes Section */}
      {regularNodes.length > 0 && (
        <div>
          <motion.h2
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2"
          >
            <Server className="w-5 h-5 text-blue-400" />
            Compute Nodes
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularNodes.map((node) => (
              <NodeCard key={node.name} node={node} />
            ))}
          </div>
        </div>
      )}

      {filteredNodes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Server className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary">No nodes found matching your criteria</p>
        </motion.div>
      )}
    </div>
  );
}
