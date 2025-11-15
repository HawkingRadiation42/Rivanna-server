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
