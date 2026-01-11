import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export interface SchemaQuestion {
  questionNumber: number;
  questionText: string;
  maxPoints: number;
}

export interface ExtractedContent {
  rawText: string;
  questions: {
    questionNumber: number;
    studentAnswer: string;
  }[];
}

function getMediaType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

export async function extractTextFromImage(
  imagePath: string,
  schemaQuestions?: SchemaQuestion[]
): Promise<ExtractedContent> {
  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mediaType = getMediaType(imagePath);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Build prompt based on whether schema questions are provided
  let prompt: string;

  if (schemaQuestions && schemaQuestions.length > 0) {
    const questionsListText = schemaQuestions
      .map((q) => `  - Question ${q.questionNumber}: "${q.questionText}" (${q.maxPoints} points)`)
      .join('\n');

    const expectedQuestionsJson = schemaQuestions
      .map((q) => `    {\n      "questionNumber": ${q.questionNumber},\n      "studentAnswer": "The student's answer to question ${q.questionNumber}"\n    }`)
      .join(',\n');

    prompt = `You are analyzing an internship test paper. Extract all text from this image, including both printed questions and handwritten answers.

The test has exactly ${schemaQuestions.length} questions:
${questionsListText}

Your task:
1. Extract the complete raw text from the image
2. For EACH of the ${schemaQuestions.length} questions listed above, find and extract the student's answer
3. If text is unclear, make your best interpretation
4. If an answer is not found or blank, use an empty string ""

Return your response as valid JSON in this exact format:
{
  "rawText": "The complete raw text extracted from the image",
  "questions": [
${expectedQuestionsJson}
  ]
}

IMPORTANT:
- You MUST return exactly ${schemaQuestions.length} question entries in the "questions" array
- Use the exact question numbers from the schema (${schemaQuestions.map(q => q.questionNumber).join(', ')})
- Preserve the student's exact wording as much as possible
- Return ONLY the JSON, no additional text`;
  } else {
    // Fallback to original behavior if no schema questions provided
    prompt = `You are analyzing an internship test paper. Extract all text from this image, including both printed questions and handwritten answers.

Your task:
1. Identify each question number and the corresponding student answer
2. Extract the complete text as written by the student
3. If text is unclear, make your best interpretation and note uncertainty

Return your response as valid JSON in this exact format:
{
  "rawText": "The complete raw text extracted from the image",
  "questions": [
    {
      "questionNumber": 1,
      "studentAnswer": "The student's answer to question 1"
    },
    {
      "questionNumber": 2,
      "studentAnswer": "The student's answer to question 2"
    }
  ]
}

Important:
- Include ALL questions found, even if the answer is blank (use empty string)
- Preserve the student's exact wording as much as possible
- If you cannot determine a question number, use -1 and include the text
- Return ONLY the JSON, no additional text`;
  }

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mediaType,
        data: base64Image,
      },
    },
    { text: prompt },
  ]);

  const response = result.response;
  const textContent = response.text();

  if (!textContent) {
    throw new Error('No text response from Gemini Vision API');
  }

  try {
    // Try to parse as JSON, handling potential markdown code blocks
    let jsonText = textContent.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }

    const parsed = JSON.parse(jsonText.trim()) as ExtractedContent;

    // If schema questions provided, ensure all questions are present
    if (schemaQuestions && schemaQuestions.length > 0) {
      const existingQuestionNumbers = new Set(parsed.questions.map(q => q.questionNumber));
      for (const schemaQ of schemaQuestions) {
        if (!existingQuestionNumbers.has(schemaQ.questionNumber)) {
          parsed.questions.push({
            questionNumber: schemaQ.questionNumber,
            studentAnswer: '',
          });
        }
      }
      // Sort by question number
      parsed.questions.sort((a, b) => a.questionNumber - b.questionNumber);
    }

    return parsed;
  } catch {
    // If JSON parsing fails, return raw text with empty questions from schema
    const emptyQuestions = schemaQuestions
      ? schemaQuestions.map(q => ({ questionNumber: q.questionNumber, studentAnswer: '' }))
      : [];
    return {
      rawText: textContent,
      questions: emptyQuestions,
    };
  }
}

export async function extractTextFromMultipleImages(
  imagePaths: string[],
  schemaQuestions?: SchemaQuestion[]
): Promise<ExtractedContent> {
  // Process all images and combine results
  const results = await Promise.all(
    imagePaths.map((path) => extractTextFromImage(path, schemaQuestions))
  );

  // Combine all results
  const combined: ExtractedContent = {
    rawText: results.map((r) => r.rawText).join('\n\n---PAGE BREAK---\n\n'),
    questions: [],
  };

  // Merge questions, handling duplicates by concatenating answers
  const questionMap = new Map<number, string>();
  for (const result of results) {
    for (const q of result.questions) {
      const existing = questionMap.get(q.questionNumber);
      if (existing !== undefined) {
        // Concatenate answers from multiple pages (if answer spans pages)
        if (q.studentAnswer && q.studentAnswer.trim()) {
          questionMap.set(
            q.questionNumber,
            existing ? `${existing}\n${q.studentAnswer}` : q.studentAnswer
          );
        }
      } else {
        questionMap.set(q.questionNumber, q.studentAnswer);
      }
    }
  }

  // Convert map back to array
  combined.questions = Array.from(questionMap.entries()).map(([questionNumber, studentAnswer]) => ({
    questionNumber,
    studentAnswer,
  }));

  // Ensure all schema questions are present
  if (schemaQuestions && schemaQuestions.length > 0) {
    const existingQuestionNumbers = new Set(combined.questions.map(q => q.questionNumber));
    for (const schemaQ of schemaQuestions) {
      if (!existingQuestionNumbers.has(schemaQ.questionNumber)) {
        combined.questions.push({
          questionNumber: schemaQ.questionNumber,
          studentAnswer: '',
        });
      }
    }
  }

  // Sort questions by number
  combined.questions.sort((a, b) => a.questionNumber - b.questionNumber);

  return combined;
}
