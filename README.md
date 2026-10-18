# OpenLearn Engine

**Learn by deciding. Understand by reflecting.**

A small TypeScript/React engine for interactive educational narratives. Story content lives in validated JSON; a reusable player handles choices, formative questions, feedback and local progress.

[Launch the working demo](https://dc75gfgb97-bit.github.io/openlearn-engine/) · [中文使用说明](README.zh-CN.md) · [Evaluation plan](research/EVALUATION.md)

## What you can try

The original fictional story **The library at a crossroads** asks learners to advise a community library on a budget decision. Two opening routes lead to three questions about sampling bias, causal claims and proportionate evaluation. All people, figures and scenarios are fictional. No private application, company or game materials are included.

- Branching scenes and inline explanatory feedback
- First-answer quiz results and an end-of-story review
- Browser-local saving and fresh-session reset
- Load your own JSON story; download the example from the player
- Runtime story validation, recovery from invalid saves, responsive layout and keyboard controls
- No account, backend, AI API key or analytics

## Run locally

Use Node.js 22.12+ and pnpm 11 (the lockfile is committed).

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

If Corepack is unavailable, install pnpm 11 separately. `pnpm build` checks TypeScript and writes the static site to `docs/`. Serve the output over HTTP; opening its HTML as a local file does not support story fetching.

## Author a story

Copy `public/library-story.json`. A story has `id`, `version`, `title`, `description`, `objectives`, `start` and `nodes`. Each node has `id`, `title`, `body` and `options`. An option has `id`, `label` and a destination node ID in `next`. A node with no options is an ending. Add `quiz: { "correctOption": "option-id", "explanation": "Why..." }` to ask a formative question.

IDs must be unique; every destination and quiz answer must exist. Every node must be reachable from the start and have a path to an ending. Cycles are allowed, so authors must review potential loops. Uploads are limited to 500 KB and 200 nodes. Text is rendered as plain React text, never arbitrary HTML. Repeated quizzes keep the first submitted answer; restarting clears this session's answers. “Scenes explored” counts visited nodes, not mastery or percentage completion. Quiz totals include all authored questions, including unvisited branches.

Progress is scoped to the story content and version in browser storage. Story changes start a new session. Storage failures leave session play available. This is convenient persistence, not a tamper-proof assessment record. Clearing browser data removes it. Third-party fonts may contact Google Fonts; system fonts provide a fallback. GitHub Pages may retain standard hosting request logs.

## Architecture

- `src/engine.ts`: schema, graph validation, pure progression/scoring and save recovery
- `src/main.tsx`: accessible React player and browser storage integration
- `public/library-story.json`: original, reusable teaching example
- `src/engine.test.ts`: automated engine regression tests
- `docs/`: committed production build for GitHub Pages

## Deployment

GitHub Pages publishes the `docs/` folder on `main`. To update it, run tests and `pnpm build`, then commit source plus `docs/`. Relative asset paths support repository subpaths. See the [GitHub publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [Vite deployment guide](https://vite.dev/guide/static-deploy.html).

## Research and evaluation

This project demonstrates an implementable educational interaction, not a new theory of learning. Its focus is a lightweight combination of branching stories, explicit learning objectives, feedback and inspectable local progress. Established narrative tools already provide branching dialogue; novelty is not claimed. Read [the proposed evaluation protocol](research/EVALUATION.md) before making claims about learning outcomes.

## Development status and attribution

**v0.1.0 — early functional prototype, created with substantial AI assistance using OpenAI Codex.** The project owner supplied the goals and scope; initial implementation, story, tests and documentation were generated with AI assistance. The owner should review and understand the code before describing personal implementation contributions. Repository history records actual development; no historical work, external contributors, adoption or research results are implied.

No learner study, educator pilot, formal accessibility audit or learning-effectiveness validation has been conducted. Local test and build results are engineering checks only. Limitations include a fixed JSON authoring format, no visual editor, no cross-device sync, no research telemetry and no certified assessment. Development checks are recorded in `VERIFICATION.md`.

## Contribute and license

See [CONTRIBUTING.md](CONTRIBUTING.md). Code, original demo content and documentation are released under the [MIT License](LICENSE). Dependency and externally served font licenses remain their respective owners'. This project is independent and unaffiliated with The Open University or its OpenLearn service.

### Browser regression check

After `pnpm build`, start `pnpm preview` in one terminal. In another, run `pnpm exec playwright install chromium` once, then `pnpm test:browser`. Set `DEMO_URL` to check another HTTP deployment. The script checks an entire route, explanatory feedback, completion, reload persistence, reset, invalid import and mobile overflow. It is browser automation, not a human learner study.
