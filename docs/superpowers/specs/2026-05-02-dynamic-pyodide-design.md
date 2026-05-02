# Backprop dynamic inline Pyodide design

## Problem

Backprop's tutor can naturally adapt across topic boundaries inside a single `/learn/[topicId]` session, but inline Python execution is currently tied to static topic project metadata. That makes the tutor capable of suggesting code practice without having a reliable way to attach runnable Pyodide sections directly to the assistant response on every learn page.

## Goals

- Make inline Pyodide available on every `/learn/[topicId]` tutor page.
- Let the tutor explicitly attach one or more runnable Pyodide sections to a single assistant response.
- Keep normal prose-first tutor replies working unchanged when runnable code is not needed.
- Allow multiple Pyodide sections in one assistant response to share message-level Python state.

## Non-goals

- Making Pyodide available across non-learn routes.
- Replacing the existing static topic project surfaces such as pre-seeded practice cells or Colab links.
- Giving Pyodide session state persistence across separate assistant messages or page reloads.
- Inferring runnable UI from plain markdown code fences.

## Recommended approach

Add a structured tutor response path for inline Pyodide sections and treat Pyodide as a general capability of all `/learn/[topicId]` pages. The tutor should keep streaming normal explanatory prose, but gain an explicit way to attach validated runnable sections to the same assistant turn. The frontend should render those sections inline under the assistant message and back them with a shared message-scoped Pyodide kernel.

## Architecture

### Page capability model

- Every `/learn/[topicId]` page should advertise inline Pyodide capability to the tutor, independent of curriculum project metadata.
- The learn page should compute a small capability object for the tutor, for example:
  - `currentTopicId`
  - `inlinePyodideAllowed: true`
  - `staticProjectRuntime: "pyodide" | "colab" | null`
- `staticProjectRuntime` remains useful for page-level extras, but it no longer determines whether the tutor may request inline runnable Python.

### Tutor response contract

- The tutor keeps producing a normal assistant turn with prose.
- In addition, the tutor may emit zero or more structured Pyodide sections attached to that same turn.
- Each Pyodide section should contain only the fields needed to render and run it, such as:
  - `title`
  - `instructions`
  - `code`
  - `runLabel` (optional)
- The tutor should use this structured path instead of encoding special behavior in markdown.

### Backend enforcement

- `TutorChat` should forward the page capability object through the existing transport into the tutor API request.
- The tutor API should use that capability in the system prompt so the model knows when inline Pyodide is available.
- The tutor API should also validate any emitted Pyodide sections before returning them to the client.
- If a page is not allowed to host inline Pyodide in the future, the API remains the enforcement point rather than relying on prompt compliance alone.

### Frontend rendering

- Split assistant message rendering into focused layers:
  - a rich tutor message renderer for prose and markdown
  - a Pyodide section list renderer for ordered inline runnable sections
  - a reusable inline Pyodide cell component for execution UI and output
- Normal prose should still render exactly as it does today.
- Structured Pyodide sections should render inline below the prose in the same assistant turn.

### Message-scoped Pyodide session

- All Pyodide sections attached to one assistant message should share one Pyodide kernel.
- That shared kernel lets later sections build on imports, variables, and helper functions created by earlier sections in the same message.
- Kernel state should not leak across separate assistant messages.
- This gives the tutor a clean mental model: one assistant turn can represent a mini coding sequence, but each turn remains isolated.

## Components and data flow

1. The learn page loads the topic and creates tutor capability metadata for the current route.
2. `TutorChat` sends that capability with the existing tutor request.
3. The tutor API builds the system prompt with the new capability context and allows the model to emit structured Pyodide sections.
4. The backend validates the structured sections and returns them alongside the assistant prose.
5. The assistant message renderer displays the prose first, then any inline Pyodide sections in order.
6. The inline Pyodide sections resolve a shared message-level kernel so later sections can reuse earlier state.

## Tutor behavior

- The tutor should use inline Pyodide sections only when runnable code materially improves the explanation or exercise flow.
- Default behavior remains prose-only replies.
- When the tutor uses Pyodide, it may attach multiple ordered sections in one response, such as:
  - a short warm-up example
  - a guided exercise
  - a small extension challenge
- The prose should explain why each section exists and what the learner should observe or change.

## Validation and error handling

- The backend should validate Pyodide payloads for shape and limits before returning them to the client.
- Validation should enforce:
  - allowed fields only
  - required code content
  - a maximum number of sections per assistant turn
- If the model emits malformed or disallowed Pyodide sections, the backend should drop those sections and keep the prose reply instead of failing the full tutor turn.
- The inline Pyodide UI should expose clear local states for:
  - kernel loading
  - ready
  - running
  - output
  - execution error
- If Pyodide bootstrap or execution fails, the learner should still see the assistant explanation and a localized runnable-section failure state.
- The UI should make shared-within-this-message state understandable so learners know why later sections can reuse earlier variables.

## Testing

- Add unit coverage for tutor request construction so page capability reaches the tutor API.
- Add backend tests for:
  - acceptance of structured Pyodide sections on `/learn/[topicId]` pages
  - filtering of malformed or disallowed Pyodide payloads
  - preservation of normal prose replies when structured Pyodide data is invalid
- Add rendering tests for:
  - assistant turns with no Pyodide sections
  - assistant turns with one inline Pyodide section
  - assistant turns with multiple ordered sections
  - shared message-level kernel behavior across sections in the same assistant turn
- Continue using the repository's existing lint, typecheck, build, and test commands for project-level validation once implementation begins.

## Notes

- Curriculum project metadata should continue to drive topic-specific page extras, such as a static practice cell with starter code or a Colab link for heavy workloads.
- Dynamic inline Pyodide is a tutor capability on learn pages, not a replacement for those topic-specific surfaces.
- This design intentionally favors explicit structured output over markdown inference because the tutor needs a stable, enforceable contract with the UI.
