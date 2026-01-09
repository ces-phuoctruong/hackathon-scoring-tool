import { useState } from "react";
import type { Question, RubricGuidelines, ScoringSchemaInput } from "../types";

interface QuestionFormData {
  questionText: string;
  maxPoints: number;
  evaluationCriteria: string;
  sampleAnswer: string;
}

interface SchemaBuilderProps {
  initialData?: {
    name: string;
    version: string;
    description: string;
    questions: Question[];
    rubricGuidelines: RubricGuidelines;
  };
  onSubmit: (data: ScoringSchemaInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const emptyQuestion: QuestionFormData = {
  questionText: "",
  maxPoints: 10,
  evaluationCriteria: "",
  sampleAnswer: "",
};

const emptyRubric: RubricGuidelines = {
  fullCredit: "Complete and accurate answer demonstrating full understanding",
  partialCredit: "Partially correct answer with some understanding shown",
  noCredit: "Incorrect or no answer provided",
};

export default function SchemaBuilder({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: SchemaBuilderProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [version, setVersion] = useState(initialData?.version || "1.0");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [questions, setQuestions] = useState<QuestionFormData[]>(
    initialData?.questions?.map((q) => ({
      questionText: q.questionText,
      maxPoints: q.maxPoints,
      evaluationCriteria: q.evaluationCriteria,
      sampleAnswer: q.sampleAnswer || "",
    })) || [{ ...emptyQuestion }]
  );
  const [rubricGuidelines, setRubricGuidelines] = useState<RubricGuidelines>(
    initialData?.rubricGuidelines || { ...emptyRubric }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionFormData,
    value: string | number
  ) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Schema name is required";
    }

    questions.forEach((q, i) => {
      if (!q.questionText.trim()) {
        newErrors[`question_${i}_text`] = "Question text is required";
      }
      if (!q.evaluationCriteria.trim()) {
        newErrors[`question_${i}_criteria`] = "Evaluation criteria is required";
      }
      if (q.maxPoints <= 0) {
        newErrors[`question_${i}_points`] = "Points must be greater than 0";
      }
    });

    if (!rubricGuidelines.fullCredit.trim()) {
      newErrors.fullCredit = "Full credit guidelines are required";
    }
    if (!rubricGuidelines.partialCredit.trim()) {
      newErrors.partialCredit = "Partial credit guidelines are required";
    }
    if (!rubricGuidelines.noCredit.trim()) {
      newErrors.noCredit = "No credit guidelines are required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: ScoringSchemaInput = {
      name: name.trim(),
      version: version.trim(),
      description: description.trim(),
      questions: questions.map((q, index) => ({
        questionNumber: index + 1,
        questionText: q.questionText.trim(),
        maxPoints: q.maxPoints,
        evaluationCriteria: q.evaluationCriteria.trim(),
        sampleAnswer: q.sampleAnswer.trim() || undefined,
      })),
      rubricGuidelines,
    };

    await onSubmit(data);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.maxPoints, 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Schema Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schema Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., Software Engineering Test 2024"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1.0"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of this test schema..."
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Questions{" "}
            <span className="text-sm font-normal text-gray-500">
              ({questions.length} questions, {totalPoints} total points)
            </span>
          </h3>
          <button
            type="button"
            onClick={addQuestion}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            + Add Question
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 font-semibold rounded-full">
                  {index + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={question.questionText}
                    onChange={(e) =>
                      updateQuestion(index, "questionText", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[`question_${index}_text`]
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter the question text..."
                  />
                  {errors[`question_${index}_text`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`question_${index}_text`]}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Points <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={question.maxPoints}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        "maxPoints",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[`question_${index}_points`]
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {errors[`question_${index}_points`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`question_${index}_points`]}
                    </p>
                  )}
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evaluation Criteria <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={question.evaluationCriteria}
                    onChange={(e) =>
                      updateQuestion(
                        index,
                        "evaluationCriteria",
                        e.target.value
                      )
                    }
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[`question_${index}_criteria`]
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="What makes a good answer? Key points to look for..."
                  />
                  {errors[`question_${index}_criteria`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`question_${index}_criteria`]}
                    </p>
                  )}
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Answer{" "}
                    <span className="text-gray-400">(Optional)</span>
                  </label>
                  <textarea
                    value={question.sampleAnswer}
                    onChange={(e) =>
                      updateQuestion(index, "sampleAnswer", e.target.value)
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Example of an ideal answer..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rubric Guidelines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Rubric Guidelines
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Credit <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rubricGuidelines.fullCredit}
              onChange={(e) =>
                setRubricGuidelines({
                  ...rubricGuidelines,
                  fullCredit: e.target.value,
                })
              }
              rows={2}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.fullCredit ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="When should full credit be awarded?"
            />
            {errors.fullCredit && (
              <p className="text-red-500 text-sm mt-1">{errors.fullCredit}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Partial Credit <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rubricGuidelines.partialCredit}
              onChange={(e) =>
                setRubricGuidelines({
                  ...rubricGuidelines,
                  partialCredit: e.target.value,
                })
              }
              rows={2}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.partialCredit ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="When should partial credit be awarded?"
            />
            {errors.partialCredit && (
              <p className="text-red-500 text-sm mt-1">
                {errors.partialCredit}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              No Credit <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rubricGuidelines.noCredit}
              onChange={(e) =>
                setRubricGuidelines({
                  ...rubricGuidelines,
                  noCredit: e.target.value,
                })
              }
              rows={2}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.noCredit ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="When should no credit be given?"
            />
            {errors.noCredit && (
              <p className="text-red-500 text-sm mt-1">{errors.noCredit}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Saving..." : "Save Schema"}
        </button>
      </div>
    </form>
  );
}
