import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testApi } from '../services/api';
import type { TestResult, TestStatusResponse } from '../types';

// Query keys factory
export const testKeys = {
  all: ['tests'] as const,
  lists: () => [...testKeys.all, 'list'] as const,
  list: (filters: { schemaId?: string; status?: string }) => [...testKeys.lists(), filters] as const,
  statuses: (ids: string[]) => [...testKeys.all, 'status', ids] as const,
  detail: (id: string) => [...testKeys.all, 'detail', id] as const,
};

// Fetch all tests with filters
export function useTests(filters?: { schemaId?: string; status?: string }) {
  return useQuery({
    queryKey: testKeys.list(filters || {}),
    queryFn: async () => {
      const response = await testApi.getAll(filters);
      return response.data.tests;
    },
  });
}

// Fetch test statuses (lightweight, for polling)
export function useTestStatuses(
  ids: string[],
  options?: { refetchInterval?: number | false; enabled?: boolean }
) {
  return useQuery({
    queryKey: testKeys.statuses(ids),
    queryFn: async (): Promise<TestStatusResponse[]> => {
      if (ids.length === 0) return [];
      const response = await testApi.getStatuses(ids);
      return response.data.tests;
    },
    enabled: (options?.enabled ?? true) && ids.length > 0,
    refetchInterval: options?.refetchInterval ?? 3000, // Poll every 3 seconds by default
  });
}

// Fetch single test detail
export function useTest(id: string) {
  return useQuery({
    queryKey: testKeys.detail(id),
    queryFn: async (): Promise<TestResult> => {
      const response = await testApi.getById(id);
      return response.data.test;
    },
    enabled: !!id,
  });
}

// Single test upload mutation
export function useUploadTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { files: File[]; schemaId: string; candidateName?: string }) =>
      testApi.upload(data.files, data.schemaId, data.candidateName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all });
    },
  });
}

// Single async process mutation
export function useProcessTestAsync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testId: string) => testApi.processAsync(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all });
    },
  });
}

// Single async score mutation
export function useScoreTestAsync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testId: string) => testApi.scoreAsync(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all });
    },
  });
}

// Batch process mutation
export function useBatchProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testIds: string[]) => testApi.batchProcess(testIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all });
    },
  });
}

// Batch score mutation
export function useBatchScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testIds: string[]) => testApi.batchScore(testIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all });
    },
  });
}

// Retry failed test mutation
export function useRetryTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (testId: string) => testApi.retry(testId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testKeys.all });
    },
  });
}

// Update review mutation
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      id: string;
      reviewData: {
        scores?: Array<{
          questionNumber: number;
          points?: number;
          feedback?: string;
          flagForReview?: boolean;
        }>;
        reviewNotes?: string;
        reviewedBy?: string;
      };
    }) => testApi.updateReview(data.id, data.reviewData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: testKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: testKeys.lists() });
    },
  });
}
