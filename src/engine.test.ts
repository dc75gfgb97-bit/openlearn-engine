import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseStory,
  initialProgress,
  choose,
  restore,
  score,
  storageKey,
} from "./engine";
const raw = JSON.parse(
  readFileSync(
    new URL("../public/library-story.json", import.meta.url),
    "utf8",
  ),
);
const story = parseStory(raw);
describe("story validation", () => {
  it("accepts the original teaching demo", () =>
    expect(story.nodes).toHaveLength(7));
  it("rejects dangling links", () => {
    const s = structuredClone(raw);
    s.nodes[0].options[0].next = "missing";
    expect(() => parseStory(s)).toThrow();
  });
  it("rejects duplicate nodes", () => {
    const s = structuredClone(raw);
    s.nodes.push(s.nodes[0]);
    expect(() => parseStory(s)).toThrow();
  });
  it("rejects nonexistent quiz answers", () => {
    const s = structuredClone(raw);
    s.nodes[3].quiz.correctOption = "missing";
    expect(() => parseStory(s)).toThrow();
  });
  it("rejects unreachable nodes", () => {
    const s = structuredClone(raw);
    s.nodes.push({ id: "orphan", title: "x", body: "x", options: [] });
    expect(() => parseStory(s)).toThrow();
  });
  it("rejects a story without endings", () => {
    const s = structuredClone(raw);
    s.nodes[6].options = [{ id: "again", label: "again", next: "arrival" }];
    expect(() => parseStory(s)).toThrow();
  });
  it("rejects malformed input", () => expect(() => parseStory({})).toThrow());
});
describe("learning progression", () => {
  it("branches deterministically without mutating prior state", () => {
    const p = initialProgress(story);
    expect(choose(story, p, "numbers").current).toBe("records");
    expect(choose(story, p, "survey").current).toBe("survey");
    expect(p.current).toBe("arrival");
  });
  it("rejects choices outside the current scene", () =>
    expect(() => choose(story, initialProgress(story), "pilot")).toThrow());
  it("completes a route and scores three correct answers", () => {
    let p = initialProgress(story);
    for (const id of ["survey", "continue", "limited", "uncertain", "pilot"])
      p = choose(story, p, id);
    expect(p.completed).toBe(true);
    expect(score(story, p)).toEqual({ correct: 3, answered: 3, total: 3 });
  });
  it("records incorrect answers without blocking completion", () => {
    let p = initialProgress(story);
    for (const id of ["numbers", "survey", "all", "certain", "spend"])
      p = choose(story, p, id);
    expect(p.completed).toBe(true);
    expect(score(story, p).correct).toBe(0);
  });
  it("counts first quiz answers on revisits", () => {
    let p = choose(
      story,
      choose(story, initialProgress(story), "survey"),
      "continue",
    );
    p = choose(story, p, "all");
    p = { ...p, current: "sampling" };
    expect(choose(story, p, "limited").answers.sampling).toBe("all");
  });
});
describe("local persistence", () => {
  it("restores valid progress", () => {
    const p = choose(story, initialProgress(story), "numbers");
    expect(restore(story, JSON.stringify(p))).toEqual(p);
  });
  it.each([
    null,
    "broken",
    "{}",
    JSON.stringify({
      current: "bad",
      visited: ["bad"],
      answers: {},
      completed: false,
    }),
  ])("recovers corrupt or missing saves: %s", (raw) =>
    expect(restore(story, raw)).toEqual(initialProgress(story)),
  );
  it("rejects invalid saved answers", () =>
    expect(
      restore(
        story,
        JSON.stringify({
          ...initialProgress(story),
          answers: { sampling: "bad" },
        }),
      ),
    ).toEqual(initialProgress(story)));
  it("separates revised story content", () =>
    expect(storageKey({ ...story, title: "Revised" })).not.toBe(
      storageKey(story),
    ));
});
