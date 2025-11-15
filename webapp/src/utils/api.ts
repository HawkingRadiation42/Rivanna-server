import axios from 'axios';
import type { NodesResponse, JobsResponse, GPUStatsResponse, GPUQueueResponse, CPUStatsResponse, OptimizationRequest, OptimizationResponse, ChatMessage } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const clusterAPI = {
  getNodes: async (): Promise<NodesResponse> => {
    const response = await api.get<NodesResponse>('/nodes');
    return response.data;
  },

  getJobs: async (): Promise<JobsResponse> => {
    const response = await api.get<JobsResponse>('/jobs');
    return response.data;
  },

  getReasons: async (): Promise<Record<string, any>> => {
    const response = await api.get('/reasons');
    return response.data;
  },

  getETA: async (spec: any): Promise<any> => {
    const response = await api.post('/eta', spec);
    return response.data;
  },

  // GPU-related methods
  getGPUStats: async (): Promise<GPUStatsResponse> => {
    const response = await api.get<GPUStatsResponse>('/gpu');
    return response.data;
  },

  getGPUQueue: async (gpuType: string): Promise<GPUQueueResponse> => {
    const response = await api.get<GPUQueueResponse>(`/gpu/${gpuType}`);
    return response.data;
  },

  // CPU-related methods
  getCPUStats: async (): Promise<CPUStatsResponse> => {
    const response = await api.get<CPUStatsResponse>('/cpu');
    return response.data;
  },

  // AI Optimization methods
  optimizeJob: async (message: string, history?: ChatMessage[]): Promise<OptimizationResponse> => {
    const response = await api.post<OptimizationResponse>('/optimize', {
      user_message: message,
      conversation_history: history
    }, {
      timeout: 60000, // 60 seconds for GPT-4 processing
    });
    return response.data;
  },
};

export default api;
