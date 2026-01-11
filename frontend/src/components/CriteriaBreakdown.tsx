import { useState } from 'react';
import type { CriterionScore } from '../types';

interface CriteriaBreakdownProps {
  breakdown: CriterionScore[];
  isEditing: boolean;
  onUpdate?: (breakdown: CriterionScore[]) => void;
  totalMaxPoints: number;
}

export default function CriteriaBreakdown({
  breakdown,
  isEditing,
  onUpdate,
  totalMaxPoints,
}: CriteriaBreakdownProps) {
  const [editedBreakdown, setEditedBreakdown] = useState<CriterionScore[]>(breakdown);

  const totalPoints = breakdown.reduce((sum, c) => sum + c.points, 0);
  const totalMax = breakdown.reduce((sum, c) => sum + c.maxPoints, 0);

  const handlePointsChange = (index: number, newPoints: number) => {
    const updated = [...editedBreakdown];
    updated[index] = {
      ...updated[index],
      points: Math.max(0, Math.min(newPoints, updated[index].maxPoints)),
    };
    setEditedBreakdown(updated);
    onUpdate?.(updated);
  };

  const handleMaxPointsChange = (index: number, newMax: number) => {
    const updated = [...editedBreakdown];
    updated[index] = {
      ...updated[index],
      maxPoints: Math.max(0, newMax),
      points: Math.min(updated[index].points, newMax),
    };
    setEditedBreakdown(updated);
    onUpdate?.(updated);
  };

  const getPercentage = (points: number, max: number) => {
    if (max === 0) return 0;
    return (points / max) * 100;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">Criteria Breakdown</h4>
        <span className="text-xs text-gray-500">
          Total: {totalPoints.toFixed(1)}/{totalMax} points
        </span>
      </div>

      <div className="space-y-2">
        {breakdown.map((criterion, index) => {
          const percentage = getPercentage(criterion.points, criterion.maxPoints);
          const progressColor = getProgressColor(percentage);
          const displayPoints = editedBreakdown[index]?.points ?? criterion.points;
          const displayMax = editedBreakdown[index]?.maxPoints ?? criterion.maxPoints;

          return (
            <div key={index} className="bg-gray-50 rounded-md p-3 border border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm text-gray-700 flex-1">{criterion.criterionText}</p>
                {isEditing ? (
                  <div className="flex items-center gap-2 ml-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={displayMax}
                      value={displayPoints}
                      onChange={(e) => handlePointsChange(index, parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-500">/</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={displayMax}
                      onChange={(e) => handleMaxPointsChange(index, parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                ) : (
                  <span className="text-sm font-medium text-gray-900 ml-3 whitespace-nowrap">
                    {displayPoints.toFixed(1)}/{displayMax}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${progressColor}`}
                  style={{ width: `${getPercentage(displayPoints, displayMax)}%` }}
                />
              </div>

              {criterion.feedback && (
                <p className="text-xs text-gray-600 mt-2 italic">{criterion.feedback}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning if breakdown doesn't match expected */}
      {totalMax !== totalMaxPoints && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mt-2">
          <p className="text-xs text-yellow-800">
            Warning: Breakdown max ({totalMax}) doesn't match question max ({totalMaxPoints})
          </p>
        </div>
      )}
    </div>
  );
}
