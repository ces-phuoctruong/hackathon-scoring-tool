import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  useTests,
  useTestStatuses,
  useBatchProcess,
  useBatchScore,
  useRetryTest,
  useProcessTestAsync,
  useScoreTestAsync,
} from "../hooks/useTests";
import type { TestResult, TestStatusResponse } from "../types";

type StatusFilter = "all" | TestResult["status"];

const STATUS_LABELS: Record<TestResult["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  extracted: "Ready for Scoring",
  scored: "Scored",
  reviewed: "Reviewed",
  error: "Error",
};

const STATUS_COLORS: Record<
  TestResult["status"],
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
  },
  processing: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
  },
  extracted: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
  },
  scored: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
  },
  reviewed: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  error: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
};

export default function ProcessingQueuePage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch all tests
  const { data: tests = [], isLoading, refetch } = useTests();

  // Get IDs of tests currently processing (for polling)
  const processingIds = useMemo(
    () => tests.filter((t) => t.status === "processing").map((t) => t._id),
    [tests]
  );

  // Poll for status updates when there are processing tests
  const { data: statusUpdates } = useTestStatuses(processingIds, {
    refetchInterval: processingIds.length > 0 ? 3000 : false,
    enabled: processingIds.length > 0,
  });

  // Merge status updates with tests
  const testsWithUpdatedStatus = useMemo(() => {
    if (!statusUpdates || statusUpdates.length === 0) return tests;

    const statusMap = new Map<string, TestStatusResponse>();
    statusUpdates.forEach((s) => statusMap.set(s._id, s));

    return tests.map((test) => {
      const update = statusMap.get(test._id);
      if (update && update.status !== test.status) {
        // Trigger refetch when status changes
        refetch();
      }
      return update
        ? { ...test, status: update.status, errorMessage: update.errorMessage }
        : test;
    });
  }, [tests, statusUpdates, refetch]);

  // Mutations
  const batchProcess = useBatchProcess();
  const batchScore = useBatchScore();
  const retryTest = useRetryTest();
  const processAsync = useProcessTestAsync();
  const scoreAsync = useScoreTestAsync();

  // Filter tests
  const filteredTests = useMemo(() => {
    if (statusFilter === "all") return testsWithUpdatedStatus;
    return testsWithUpdatedStatus.filter((t) => t.status === statusFilter);
  }, [testsWithUpdatedStatus, statusFilter]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: tests.length,
      pending: 0,
      processing: 0,
      extracted: 0,
      scored: 0,
      reviewed: 0,
      error: 0,
    };
    tests.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });
    return counts;
  }, [tests]);

  // Selection helpers
  const handleSelectTest = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllPending = () => {
    const pendingIds = testsWithUpdatedStatus
      .filter((t) => t.status === "pending")
      .map((t) => t._id);
    setSelectedIds(new Set(pendingIds));
  };

  const handleSelectAllExtracted = () => {
    const extractedIds = testsWithUpdatedStatus
      .filter((t) => t.status === "extracted")
      .map((t) => t._id);
    setSelectedIds(new Set(extractedIds));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch actions
  const handleBatchProcess = async () => {
    const eligibleIds = Array.from(selectedIds).filter((id) => {
      const test = testsWithUpdatedStatus.find((t) => t._id === id);
      return test?.status === "pending";
    });

    if (eligibleIds.length === 0) return;

    try {
      await batchProcess.mutateAsync(eligibleIds);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Batch process error:", err);
    }
  };

  const handleBatchScore = async () => {
    const eligibleIds = Array.from(selectedIds).filter((id) => {
      const test = testsWithUpdatedStatus.find((t) => t._id === id);
      return test?.status === "extracted";
    });

    if (eligibleIds.length === 0) return;

    try {
      await batchScore.mutateAsync(eligibleIds);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Batch score error:", err);
    }
  };

  // Single actions
  const handleSingleProcess = async (id: string) => {
    try {
      await processAsync.mutateAsync(id);
    } catch (err) {
      console.error("Process error:", err);
    }
  };

  const handleSingleScore = async (id: string) => {
    try {
      await scoreAsync.mutateAsync(id);
    } catch (err) {
      console.error("Score error:", err);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await retryTest.mutateAsync(id);
    } catch (err) {
      console.error("Retry error:", err);
    }
  };

  // Helper to format elapsed time
  const formatElapsedTime = (startTime?: string) => {
    if (!startTime) return "";
    const elapsed = Date.now() - new Date(startTime).getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const StatusBadge = ({ status }: { status: TestResult["status"] }) => {
    const colors = STATUS_COLORS[status];
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
      >
        {STATUS_LABELS[status]}
      </span>
    );
  };

  // Count selected by status
  const selectedPendingCount = Array.from(selectedIds).filter((id) => {
    const test = testsWithUpdatedStatus.find((t) => t._id === id);
    return test?.status === "pending";
  }).length;

  const selectedExtractedCount = Array.from(selectedIds).filter((id) => {
    const test = testsWithUpdatedStatus.find((t) => t._id === id);
    return test?.status === "extracted";
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Processing Queue</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage test processing and scoring.
          </p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Upload New Tests
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {(
          [
            "pending",
            "processing",
            "extracted",
            "scored",
            "reviewed",
            "error",
          ] as const
        ).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-4 rounded-lg border-2 transition-all ${
              statusFilter === status
                ? `${STATUS_COLORS[status].border} ${STATUS_COLORS[status].bg}`
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">
              {statusCounts[status]}
            </div>
            <div
              className={`text-sm font-medium ${STATUS_COLORS[status].text}`}
            >
              {STATUS_LABELS[status]}
            </div>
          </button>
        ))}
      </div>

      {/* Filter and Batch Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                statusFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({statusCounts.all})
            </button>
            {(["pending", "processing", "extracted", "error"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm rounded-md ${
                    statusFilter === status
                      ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {STATUS_LABELS[status]} ({statusCounts[status]})
                </button>
              )
            )}
          </div>

          {/* Batch Actions */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-gray-500">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={handleSelectAllPending}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              disabled={statusCounts.pending === 0}
            >
              Select Pending
            </button>
            <button
              onClick={handleSelectAllExtracted}
              className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
              disabled={statusCounts.extracted === 0}
            >
              Select Extracted
            </button>
            {selectedPendingCount > 0 && (
              <button
                onClick={handleBatchProcess}
                disabled={batchProcess.isPending}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {batchProcess.isPending
                  ? "Processing..."
                  : `Process Selected (${selectedPendingCount})`}
              </button>
            )}
            {selectedExtractedCount > 0 && (
              <button
                onClick={handleBatchScore}
                disabled={batchScore.isPending}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {batchScore.isPending
                  ? "Scoring..."
                  : `Score Selected (${selectedExtractedCount})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Test Cards */}
      {filteredTests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">
            {statusFilter === "all"
              ? "No tests uploaded yet."
              : `No ${STATUS_LABELS[
                  statusFilter as TestResult["status"]
                ].toLowerCase()} tests.`}
          </p>
          <button
            onClick={() => navigate("/upload")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Upload Tests
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((test) => {
            const isSelected = selectedIds.has(test._id);
            // schemaId can be populated as an object with name/version or just the ID string
            const schemaObj = test.scoringSchema;
            const schemaName = schemaObj
              ? `${schemaObj.name || "Unknown"} (v${schemaObj.version || "?"})`
              : "Unknown Schema";

            return (
              <div
                key={test._id}
                className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                  isSelected ? "border-blue-500" : "border-gray-200"
                }`}
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {test.status !== "scored" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectTest(test._id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {test.candidateName || "Unnamed"}
                        </h3>
                        <p className="text-sm text-gray-500">{schemaName}</p>
                      </div>
                    </div>
                    <StatusBadge status={test.status} />
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Uploaded:</span>
                      <span className="text-gray-700">
                        {dayjs(test.createdAt).format("DD-MM-YYYY HH:mm:ss")}
                      </span>
                    </div>
                    {test.status === "processing" && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Processing time:</span>
                        <span className="text-blue-600 font-medium">
                          {formatElapsedTime(
                            test.processingStartedAt || test.scoringStartedAt
                          )}
                        </span>
                      </div>
                    )}
                    {(test.status === "scored" ||
                      test.status === "reviewed") && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Score:</span>
                        <span className="text-gray-900 font-medium">
                          {test.totalScore}/{test.maxScore} (
                          {((test.totalScore / test.maxScore) * 100).toFixed(0)}
                          %)
                        </span>
                      </div>
                    )}
                    {test.status === "error" && test.errorMessage && (
                      <div className="bg-red-50 p-2 rounded text-sm text-red-700">
                        {test.errorMessage}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    {test.status !== "pending" && (
                      <button
                        onClick={() => navigate(`/review/${test._id}`)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </button>
                    )}
                    <div className="flex gap-2">
                      {test.status === "pending" && (
                        <button
                          onClick={() => handleSingleProcess(test._id)}
                          disabled={processAsync.isPending}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          Process
                        </button>
                      )}
                      {test.status === "extracted" && (
                        <button
                          onClick={() => handleSingleScore(test._id)}
                          disabled={scoreAsync.isPending}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          Score
                        </button>
                      )}
                      {test.status === "processing" && (
                        <span className="flex items-center gap-2 text-sm text-blue-600">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></span>
                          Processing...
                        </span>
                      )}
                      {test.status === "error" && (
                        <button
                          onClick={() => handleRetry(test._id)}
                          disabled={retryTest.isPending}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
