import axios from 'axios';
import type { NodesResponse, JobsResponse } from '../types';

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
};

export default api;
