import axios from 'axios';
import type { ScoringSchema, ScoringSchemaInput, TestResult } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Schema API
export const schemaApi = {
  getAll: () => api.get<{ schemas: ScoringSchema[] }>('/schemas'),
  getById: (id: string) => api.get<{ schema: ScoringSchema }>(`/schemas/${id}`),
  create: (data: ScoringSchemaInput) => api.post<{ schema: ScoringSchema }>('/schemas', data),
  update: (id: string, data: Partial<ScoringSchemaInput>) => api.put<{ schema: ScoringSchema }>(`/schemas/${id}`, data),
  delete: (id: string) => api.delete(`/schemas/${id}`),
};

export interface ReviewUpdateData {
  scores?: {
    questionNumber: number;
    points?: number;
    feedback?: string;
    flagForReview?: boolean;
  }[];
  reviewNotes?: string;
  reviewedBy?: string;
}

// Test API
export const testApi = {
  upload: (files: File[], schemaId: string, candidateName?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('schemaId', schemaId);
    if (candidateName) {
      formData.append('candidateName', candidateName);
    }
    return api.post<{ test: Partial<TestResult> }>('/tests/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  process: (id: string) => api.post<{ test: Partial<TestResult> }>(`/tests/${id}/process`),
  score: (id: string) => api.post<{ test: TestResult }>(`/tests/${id}/score`),
  getAll: (filters?: { schemaId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.schemaId) params.append('schemaId', filters.schemaId);
    if (filters?.status) params.append('status', filters.status);
    return api.get<{ tests: TestResult[] }>(`/tests?${params.toString()}`);
  },
  getById: (id: string) => api.get<{ test: TestResult }>(`/tests/${id}`),
  updateReview: (id: string, data: ReviewUpdateData) => api.put<{ test: TestResult }>(`/tests/${id}/review`, data),
  exportCsv: (schemaId?: string) => {
    const params = schemaId ? `?schemaId=${schemaId}` : '';
    return api.get(`/tests/export/csv${params}`, { responseType: 'blob' });
  },
};

export default api;
