import axios from 'axios';
import type {
  ScoringSchema,
  ScoringSchemaInput,
  TestResult,
  TestStatusResponse,
  BatchUploadResult,
  ReviewUpdateData,
} from '../types';

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
  update: (id: string, data: Partial<ScoringSchemaInput>) =>
    api.put<{ schema: ScoringSchema }>(`/schemas/${id}`, data),
  delete: (id: string) => api.delete(`/schemas/${id}`),
};

// Test API
export const testApi = {
  // Upload a single test with multiple images
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

  // Synchronous processing (blocking)
  process: (id: string) => api.post<{ test: Partial<TestResult> }>(`/tests/${id}/process`),
  updateExtractedText: (
    id: string,
    data: {
      extractedText?: string;
      extractedAnswers?: { questionNumber: number; studentAnswer: string }[];
    }
  ) => api.patch<{ test: Partial<TestResult> }>(`/tests/${id}/extracted-text`, data),
  score: (id: string, extractedAnswers?: { questionNumber: number; studentAnswer: string }[]) =>
    api.post<{ test: TestResult }>(`/tests/${id}/score`, { extractedAnswers }),
  
  // Async processing (non-blocking)
  processAsync: (id: string) =>
    api.post<{ test: { _id: string; status: string }; message: string }>(
      `/tests/${id}/process/async`
    ),
  scoreAsync: (id: string) =>
    api.post<{ test: { _id: string; status: string }; message: string }>(`/tests/${id}/score/async`),

  // Batch operations
  batchProcess: (testIds: string[]) =>
    api.post<{ results: { _id: string; started: boolean; reason?: string }[] }>(
      '/tests/batch/process',
      { testIds }
    ),
  batchScore: (testIds: string[]) =>
    api.post<{ results: { _id: string; started: boolean; reason?: string }[] }>(
      '/tests/batch/score',
      { testIds }
    ),

  // Status polling endpoint (lightweight)
  getStatuses: (ids: string[]) =>
    api.get<{ tests: TestStatusResponse[] }>(`/tests/status?ids=${ids.join(',')}`),

  // Retry failed test
  retry: (id: string) =>
    api.post<{ test: { _id: string; status: string } }>(`/tests/${id}/retry`),
  getAll: (filters?: { schemaId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.schemaId) params.append('schemaId', filters.schemaId);
    if (filters?.status) params.append('status', filters.status);
    return api.get<{ tests: TestResult[] }>(`/tests?${params.toString()}`);
  },
  getById: (id: string) => api.get<{ test: TestResult }>(`/tests/${id}`),

  // Review and export
  updateReview: (id: string, data: ReviewUpdateData) =>
    api.put<{ test: TestResult }>(`/tests/${id}/review`, data),
  exportCsv: (schemaId?: string) => {
    const params = schemaId ? `?schemaId=${schemaId}` : '';
    return api.get(`/tests/export/csv${params}`, { responseType: 'blob' });
  },
};

export default api;
