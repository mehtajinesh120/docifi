export interface Question {
  id: string;
  number: string;
  question: string;
  context?: string;
  textAnswer?: string;
}

export interface AnswerImage {
  id: string;
  name: string;
  source: "zip" | "file" | "imgbb";
  base64: string;
  mimeType: string;
  size?: number;
  width?: number;
  height?: number;
  matchedQuestionId?: string | null;
  confidence?: number;
  rationale?: string;
}

export interface DocifyConfig {
  topicName: string;
  questionsPerPage: number; // 0 = continuous (no forced page breaks), 1, 2, 3, 4
  printBlankForUnanswered: boolean; // if true, keep unanswered questions with blank answer space; if false, exclude them
  blankSpaceLines: number; // lines of ruled space for blank answers
  studentName?: string;
  rollNumber?: string;
  subjectCode?: string;
  includeStudentHeader?: boolean;
}

export interface ExtractionResult {
  topic: string;
  questions: Question[];
}

export interface MatchResultItem {
  imageId: string;
  questionId: string | null;
  confidence: number;
  rationale: string;
}
