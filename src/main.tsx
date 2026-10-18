import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  choose,
  initialProgress,
  parseStory,
  restore,
  score,
  storageKey,
  type Story,
  type Progress,
} from "./engine";
import "./style.css";
function App() {
  const [story, setStory] = useState<Story>();
  const [progress, setProgress] = useState<Progress>();
  const [error, setError] = useState("");
  const [saveNote, setSaveNote] = useState(
    "Progress stays in this browser. No account or analytics.",
  );
  const [selected, setSelected] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);
  function load(input: unknown) {
    const s = parseStory(input);
    let p = initialProgress(s);
    try {
      p = restore(s, localStorage.getItem(storageKey(s)));
    } catch {
      setSaveNote(
        "Browser storage is unavailable. You can still play this session.",
      );
    }
    setStory(s);
    setProgress(p);
    setSelected(undefined);
    setError("");
  }
  async function demo() {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}library-story.json`);
      if (!r.ok) throw Error("Unable to load demo.");
      load(await r.json());
    } catch {
      setError("Could not load the demo. Check your connection and try again.");
    }
  }
  useEffect(() => {
    void demo();
  }, []);
  useEffect(() => {
    if (story && progress)
      try {
        localStorage.setItem(storageKey(story), JSON.stringify(progress));
      } catch {
        setSaveNote(
          "Progress could not be saved. Keep this tab open to continue.",
        );
      }
  }, [story, progress]);
  useEffect(() => {
    heading.current?.focus();
  }, [progress?.current]);
  const node = story?.nodes.find((n) => n.id === progress?.current);
  const result = story && progress ? score(story, progress) : undefined;
  function advance(id: string) {
    if (story && progress) {
      setProgress(choose(story, progress, id));
      setSelected(undefined);
    }
  }
  return (
    <>
      <header>
        <a className="brand" href="./">
          ◈{" "}
          <span>
            OpenLearn<span className="light"> Engine</span>
          </span>
        </a>
        <a href="https://github.com/dc75gfgb97-bit/openlearn-engine">
          Source ↗
        </a>
      </header>
      <main>
        <section className="intro">
          <p className="eyebrow">OPEN SOURCE · INTERACTIVE LEARNING · v0.1</p>
          <h1>
            Learn by deciding.
            <br />
            <span>Understand by reflecting.</span>
          </h1>
          <p className="lead">
            Explore a story, weigh the evidence, and see what your choices teach
            you.
          </p>
        </section>
        <div className="workspace">
          <aside>
            <p className="eyebrow">YOUR LEARNING LAB</p>
            <h2>
              A small story.
              <br />A bigger question.
            </h2>
            <p>
              Designed for curious learners and educators who want to make
              knowledge something you can explore.
            </p>
            <div className="tags">
              <span>Evidence literacy</span>
              <span>5–8 min</span>
              <span>Original demo</span>
            </div>
            {story && (
              <>
                <h3>Learning objectives</h3>
                <ul>
                  {story.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <h3>Your session</h3>
                <p>
                  {progress?.visited.length} unique scenes explored ·{" "}
                  {result?.answered}/{result?.total} questions answered
                </p>
                <progress
                  aria-label="Questions answered"
                  value={result?.answered ?? 0}
                  max={result?.total || 1}
                />
                <p className="small">
                  Different branches can visit different scenes. Scene counts
                  are exploration, not learning scores.
                </p>
              </>
            )}
            <div className="tools">
              <button onClick={() => void demo()}>Load original demo</button>
              <label className="file">
                Load your story (.json)
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 500000) throw Error();
                      load(JSON.parse(await file.text()));
                    } catch {
                      setError(
                        "Invalid story. Use the demo JSON format, unique IDs, valid links and a reachable ending (maximum 500 KB).",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <a href="./library-story.json" download>
                Download sample story ↓
              </a>
            </div>
          </aside>
          <section className="player" aria-label="Story player">
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {node && story && progress ? (
              <>
                <div className="player-top">
                  <span>
                    {progress.completed
                      ? "REFLECTION"
                      : node.quiz
                        ? "CHECK YOUR THINKING"
                        : "THE STORY"}
                  </span>
                  <span>{story.title}</span>
                </div>
                <h2 tabIndex={-1} ref={heading}>
                  {node.title}
                </h2>
                <p className="body">{node.body}</p>
                {!progress.completed && (
                  <div className="choices">
                    {node.options.map((o, i) => (
                      <button
                        disabled={!!selected}
                        key={o.id}
                        onClick={() =>
                          node.quiz ? setSelected(o.id) : advance(o.id)
                        }
                      >
                        <span className="number">0{i + 1}</span>
                        {o.label}
                        <span className="arrow">↗</span>
                      </button>
                    ))}
                  </div>
                )}
                {selected && node.quiz && (
                  <div className="feedback" role="status">
                    <strong>
                      {selected === node.quiz.correctOption
                        ? "Good reasoning."
                        : "An opportunity to reconsider."}
                    </strong>
                    <p>{node.quiz.explanation}</p>
                    <button onClick={() => advance(selected)}>
                      Continue →
                    </button>
                  </div>
                )}
                {progress.completed && (
                  <div className="feedback">
                    <strong>
                      Story complete · {result?.correct}/{result?.answered}{" "}
                      first answers correct
                    </strong>
                    <p>
                      This is a practice result, not a validated measure of
                      learning. Review each explanation and try another route.
                    </p>
                    {story.nodes
                      .filter((n) => n.quiz && progress.answers[n.id])
                      .map((n) => (
                        <details key={n.id}>
                          <summary>
                            {n.title} —{" "}
                            {progress.answers[n.id] === n.quiz!.correctOption
                              ? "Correct"
                              : "Review"}
                          </summary>
                          <p>
                            Your answer:{" "}
                            {
                              n.options.find(
                                (o) => o.id === progress.answers[n.id],
                              )?.label
                            }
                          </p>
                          <p>{n.quiz!.explanation}</p>
                        </details>
                      ))}
                    <button
                      onClick={() => {
                        setProgress(initialProgress(story));
                        setSelected(undefined);
                      }}
                    >
                      Start a fresh session ↻
                    </button>
                  </div>
                )}
                <div className="privacy">
                  <span className="dot" />
                  {saveNote}
                </div>
              </>
            ) : (
              <p>Loading the learning lab…</p>
            )}
          </section>
        </div>
        <footer>
          <p>
            An early, AI-assisted open-source prototype. No learner study or
            effectiveness claims.
          </p>
          <a href="https://github.com/dc75gfgb97-bit/openlearn-engine#research-and-evaluation">
            Development & research notes ↗
          </a>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
