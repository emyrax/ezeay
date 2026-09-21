export interface ScheduleSuggestTaskInput {
  id: string;
  title: string;
  time?: string;
  done: boolean;
}

export function buildScheduleSuggestPrompt(input: {
  date: string;
  tasks: ScheduleSuggestTaskInput[];
}): { system: string; jsonShape: unknown } {
  const list = input.tasks
    .filter((t) => !t.done)
    .slice(0, 25)
    .map((t, i) => `${i + 1}. [${t.time ?? "no time"}] ${t.title}`)
    .join("\n");

  const system = [
    "You are Yuinx's daily planner assistant for a busy student.",
    `Today is ${input.date}. Here is the user's to-do list for today:`,
    list || "(no tasks listed)",
    "Suggest the 3-5 most important tasks the user should focus on today. Rank by urgency (time pressure first), importance, and low effort for quick wins. Only use task ids that appear in the list.",
    'Respond with ONLY a JSON object in the shape {"suggestions":[{"id":"task id from the list","reason":"one short sentence"}]} — no markdown, no code fences, no explanation.',
  ].join("\n\n");

  return {
    system,
    jsonShape: { suggestions: [{ id: "string", reason: "string" }] },
  };
}