import { z } from "zod";
const option = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  next: z.string().min(1),
});
const node = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  options: z.array(option),
  quiz: z
    .object({ correctOption: z.string(), explanation: z.string().min(1) })
    .optional(),
});
const schema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  objectives: z.array(z.string()).min(1),
  start: z.string(),
  nodes: z.array(node).min(1).max(200),
});
export type Story = z.infer<typeof schema>;
export function parseStory(input: unknown): Story {
  const story = schema.parse(input);
  const ids = new Set(story.nodes.map((n) => n.id));
  if (ids.size !== story.nodes.length || !ids.has(story.start))
    throw new Error("Node IDs must be unique and the start node must exist.");
  for (const n of story.nodes) {
    if (new Set(n.options.map((o) => o.id)).size !== n.options.length)
      throw new Error("Option IDs must be unique within each node.");
    if (n.options.some((o) => !ids.has(o.next)))
      throw new Error("Every option must link to an existing node.");
    if (n.quiz && !n.options.some((o) => o.id === n.quiz!.correctOption))
      throw new Error("Quiz answer must reference an option.");
  }
  const reachable = new Set<string>();
  function visit(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    story.nodes.find((n) => n.id === id)!.options.forEach((o) => visit(o.next));
  }
  visit(story.start);
  if (reachable.size !== ids.size)
    throw new Error("All nodes must be reachable.");
  // Every reachable node must have a path to an ending (cycles may still be authored).
  const ending = new Set(
    story.nodes.filter((n) => !n.options.length).map((n) => n.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of story.nodes)
      if (!ending.has(n.id) && n.options.some((o) => ending.has(o.next))) {
        ending.add(n.id);
        changed = true;
      }
  }
  if (ending.size !== ids.size)
    throw new Error("Every node needs a path to an ending.");
  return story;
}
export type Progress = {
  current: string;
  visited: string[];
  answers: Record<string, string>;
  completed: boolean;
};
export const initialProgress = (s: Story): Progress => ({
  current: s.start,
  visited: [s.start],
  answers: {},
  completed: !s.nodes.find((n) => n.id === s.start)!.options.length,
});
export function choose(s: Story, p: Progress, optionId: string): Progress {
  const n = s.nodes.find((n) => n.id === p.current)!;
  const o = n.options.find((o) => o.id === optionId);
  if (!o) throw new Error("Invalid choice.");
  return {
    current: o.next,
    visited: [...new Set([...p.visited, o.next])],
    answers: n.quiz
      ? { ...p.answers, [n.id]: p.answers[n.id] ?? o.id }
      : p.answers,
    completed: !s.nodes.find((n) => n.id === o.next)!.options.length,
  };
}
export function score(s: Story, p: Progress) {
  const answered = s.nodes.filter(
    (n) => n.quiz && p.answers[n.id] !== undefined,
  );
  return {
    correct: answered.filter((n) => p.answers[n.id] === n.quiz!.correctOption)
      .length,
    answered: answered.length,
    total: s.nodes.filter((n) => n.quiz).length,
  };
}
export const storageKey = (s: Story) =>
  `openlearn:${s.id}:${s.version}:${JSON.stringify(s)}`;
export function restore(s: Story, raw: string | null): Progress {
  try {
    const p = z
      .object({
        current: z.string(),
        visited: z.array(z.string()).min(1),
        answers: z.record(z.string(), z.string()),
        completed: z.boolean(),
      })
      .parse(JSON.parse(raw ?? "null"));
    if (
      !p.visited.includes(s.start) ||
      !p.visited.includes(p.current) ||
      p.visited.some((id) => !s.nodes.some((n) => n.id === id))
    )
      return initialProgress(s);
    if (
      Object.entries(p.answers).some(
        ([id, value]) =>
          !s.nodes.some(
            (n) =>
              n.id === id && n.quiz && n.options.some((o) => o.id === value),
          ),
      )
    )
      return initialProgress(s);
    if (
      p.completed !== !s.nodes.find((n) => n.id === p.current)!.options.length
    )
      return initialProgress(s);
    return p;
  } catch {
    return initialProgress(s);
  }
}
