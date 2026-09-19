export function buildStudyExtractionPrompt(input: {
  fileType: string;
  extractedText?: string;
}): string {
  const typeGuide: Record<string, string> = {
    image:
      "This is an image of a document (timetable, notes, or study material). Extract all visible text and structure it logically.",
    pdf: "This is a PDF document. Extract the full text content and preserve the document structure.",
    doc: "This is a Word document. Extract the full text content and preserve headings and structure.",
    txt: "This is a plain text file. Organize the content into logical sections.",
    text: "This is plain text content. Organize it into logical sections.",
    timetable:
      "This is a timetable/schedule image. Extract the schedule data precisely.",
  };

  const guide = typeGuide[input.fileType] || typeGuide.text;

  return `You are a study material analyzer for Yuinx, a gamified learning app.

${guide}

${input.extractedText ? `Content to analyze:\n${input.extractedText}` : "Analyze the provided file/image content."}

First, determine if this is a TIMETABLE (weekly class schedule) or STUDY_CONTENT (educational material).

If it's a TIMETABLE, extract:
- Each day of the week
- For each day, time slots with: start time, end time, subject name, location/room

If it's STUDY_CONTENT, extract and structure into:
- A concise title
- A 1-2 sentence summary
- 3-12 "study bites" — each bite is one key concept (title + 2-4 sentences of explanation)
- Each bite should have 1-3 quiz questions (multiple choice, 4 options each) that test understanding

Return ONLY valid JSON with this exact structure:
{
  "contentType": "timetable" | "study_content",
  "title": "Title of the material",
  "summary": "Brief summary",
  "bites": [
    {
      "id": "bite_1",
      "title": "Bite title",
      "content": "2-4 sentences explaining this concept",
      "order": 1,
      "quizzes": [
        {
          "id": "quiz_1",
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0
        }
      ]
    }
  ],
  "timetable": {
    "slots": [
      {
        "id": "slot_1",
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "10:30",
        "subject": "Subject Name",
        "location": "Room 101"
      }
    ]
  }
}

Rules:
- For study content: generate 3-12 bites depending on content length
- Each bite must have at least 1 quiz question, max 3
- Quiz questions must have exactly 4 options
- correctAnswer is the 0-based index of the correct option
- For timetables: timetable should be populated, bites should be empty array
- For study content: timetable should be null, bites should be populated
- Do NOT include any markdown code fences. Return raw JSON only.`;
}

export function buildStudyQuizPrompt(content: string): string {
  return `You are a quiz master for Yuinx, a gamified learning app.

Based on this study content, generate 5 multiple-choice questions to test understanding.

Content:
${content}

Rules:
- Generate exactly 5 questions
- Each question must have exactly 4 options
- The correct answer is the 0-based index of the correct option
- Questions should test genuine understanding, not just memorization
- Vary the difficulty across questions

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "id": "q_1",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Do NOT include any markdown code fences. Return raw JSON only.`;
}
