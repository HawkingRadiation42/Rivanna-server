export interface Node {
  partition: string;
  name: string;
  state: string;
  cpusA: number;
  cpusI: number;
  cpusO: number;
  cpusT: number;
  mem_mb: number;
  gres?: string | null;
}

export interface Job {
  id: string;
  partition: string;
  name: string;
  user: string;
  state: string;
  runtime: string;
  nodes: number;
  reason: string;
  req_cpus: number;
  req_mem: string;
  req_gres?: string | null;
}

export interface NodesResponse {
  generated_at: number;
  nodes: Node[];
}

export interface JobsResponse {
  generated_at: number;
  jobs: Job[];
}

export interface ReasonInfo {
  title: string;
  explain: string;
  fixes: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// GPU-related types
export interface GPUOverall {
  total_gpus: number;
  gpus_in_use: number;
  gpus_free: number;
  utilization_percent: number;
}

export interface GPUTypeInfo {
  type: string;
  total: number;
  in_use: number;
  free: number;
  utilization_percent: number;
}

export interface GPUStatsResponse {
  success: boolean;
  overall: GPUOverall;
  gpu_types: GPUTypeInfo[];
  raw_output: string;
}

export interface GPUJob {
  job_id: string;
  user: string;
  name: string;
  state: string;
  time_used: string;
  time_limit: string;
  tres_per_node: string;
  nodelist: string;
}

export interface GPUQueueResponse {
  success: boolean;
  gpu_type: string;
  partition: string;
  job_count: number;
  jobs: GPUJob[];
  raw_output: string;
}

// CPU-related types
export interface ClusterTotals {
  total_cpus: number;
  total_memory_mb: number;
  total_memory_gib: number;
}

export interface CPUNode {
  node_name: string;
  idle_cpus: number;
  total_cpus: number;
  usage_percent: number;
}

export interface MemoryNode {
  node_name: string;
  available_memory_mb: number;
  available_memory_gib: number;
  total_memory_mb: number;
  total_memory_gib: number;
  usage_percent: number;
}

export interface CPUStatsResponse {
  success: boolean;
  cluster_totals: ClusterTotals;
  top_cpu_nodes: CPUNode[];
  top_memory_nodes: MemoryNode[];
  raw_output: string;
}
