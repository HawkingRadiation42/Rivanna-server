import { Node, Job } from '../types';

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 MB';
  const mb = bytes;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  const gb = mb / 1024;
  if (gb < 1024) return `${gb.toFixed(1)} GB`;
  const tb = gb / 1024;
  return `${tb.toFixed(1)} TB`;
};

export const getNodeStatusColor = (state: string): string => {
  const stateMap: Record<string, string> = {
    idle: 'status-idle',
    mix: 'status-mix',
    alloc: 'status-alloc',
    down: 'status-down',
    drain: 'status-drain',
  };
  return stateMap[state.toLowerCase()] || 'status-drain';
};

export const getJobStatusColor = (state: string): string => {
  const stateMap: Record<string, string> = {
    R: 'status-alloc',
    PD: 'status-mix',
    CG: 'status-idle',
    F: 'status-down',
  };
  return stateMap[state.toUpperCase()] || 'badge';
};

export const calculateClusterStats = (nodes: Node[]) => {
  const totalCPUs = nodes.reduce((sum, node) => sum + node.cpusT, 0);
  const idleCPUs = nodes.reduce((sum, node) => sum + node.cpusI, 0);
  const allocCPUs = nodes.reduce((sum, node) => sum + node.cpusA, 0);
  const totalMemory = nodes.reduce((sum, node) => sum + node.mem_mb, 0);

  const gpuNodes = nodes.filter(node => node.gres && node.gres.includes('gpu'));
  const totalGPUs = gpuNodes.length;

  return {
    totalNodes: nodes.length,
    totalCPUs,
    idleCPUs,
    allocCPUs,
    cpuUtilization: totalCPUs > 0 ? ((allocCPUs / totalCPUs) * 100).toFixed(1) : '0',
    totalMemory,
    totalGPUs,
    idleNodes: nodes.filter(n => n.state.toLowerCase() === 'idle').length,
  };
};

export const groupJobsByPartition = (jobs: Job[]) => {
  return jobs.reduce((acc, job) => {
    if (!acc[job.partition]) {
      acc[job.partition] = [];
    }
    acc[job.partition].push(job);
    return acc;
  }, {} as Record<string, Job[]>);
};
