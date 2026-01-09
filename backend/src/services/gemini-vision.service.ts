import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

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

export async function extractTextFromImage(imagePath: string): Promise<ExtractedContent> {
  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mediaType = getMediaType(imagePath);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are analyzing an internship test paper. Extract all text from this image, including both printed questions and handwritten answers.

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
    return parsed;
  } catch {
    // If JSON parsing fails, return raw text
    return {
      rawText: textContent,
      questions: [],
    };
  }
}

export async function extractTextFromMultipleImages(imagePaths: string[]): Promise<ExtractedContent> {
  // Process all images and combine results
  const results = await Promise.all(imagePaths.map((path) => extractTextFromImage(path)));

  // Combine all results
  const combined: ExtractedContent = {
    rawText: results.map((r) => r.rawText).join('\n\n---PAGE BREAK---\n\n'),
    questions: [],
  };

  // Merge questions, handling duplicates by taking the first occurrence
  const seenQuestions = new Set<number>();
  for (const result of results) {
    for (const q of result.questions) {
      if (!seenQuestions.has(q.questionNumber)) {
        seenQuestions.add(q.questionNumber);
        combined.questions.push(q);
      }
    }
  }

  // Sort questions by number
  combined.questions.sort((a, b) => a.questionNumber - b.questionNumber);

  return combined;
}
