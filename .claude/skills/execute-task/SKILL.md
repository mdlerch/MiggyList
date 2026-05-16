---
name: execute-task
description: Use this skill when the user wants to work on, tackle, execute, or get a first pass on a task. Trigger on phrases like "let's work on X", "help me with X", "first pass on X", "tackle X", "draft X", or an explicit invocation with a task name or description.
version: 0.1.0
---

# Execute Task

Produce a first-pass draft or structured output for a MiggyList task so the user has something concrete to react to and refine.

## Context

The user is a product manager at a software company. Tasks are rarely about writing software. They are more often about writing documentation, drafting communications, connecting with people, making and recording decisions, doing research, or organizing thinking. The deliverable is almost always text.

## Workflow

1. **Identify the task** — if the user named a task, find it. If not, call `mcp__miggylist__list_boards` and then fetch the relevant board to show active tasks (`Spark` or `In Progress` status), and ask which one to work on.

2. **Load the full task** — get the item details including the description. Read the `## Context`, `## Done when`, and `## Notes` sections carefully before doing anything else.

3. **Identify the deliverable type** — based on the title and description, determine what artifact the task calls for. Common types for PM work:
   - **Document or spec** — a written artifact meant to inform or align others
   - **Email or message** — direct communication to a specific person or group
   - **Decision record** — capture a decision, its rationale, and alternatives considered
   - **Talking points or meeting prep** — structured notes for a conversation
   - **Research summary** — findings and synthesis on a topic
   - **Outline or plan** — structure for something larger, not the full thing yet
   - **Action list** — concrete next steps broken down from a broader goal

4. **Ask one clarifying question if critical information is missing** — only block on something that would make the draft wrong, not just incomplete. If "done when" is absent or vague, make a reasonable assumption and proceed. State the assumption explicitly.

5. **Produce the first draft** — write the artifact in full. Do not produce a meta-description of what you would write. Write the actual thing.

6. **Close with a short note** — one or two sentences on key assumptions made and any open questions the user should address before this is final.

7. **Offer to update the task** — ask if the user wants to mark the task `In Progress` (if it isn't already) or update the description with any new context that emerged.

## Principles

- Bias toward producing output over asking questions. A draft the user can edit is more valuable than a perfect brief.
- Match the tone and register of the deliverable to its audience — internal alignment docs read differently than external-facing communications.
- If the description is thin, do your best with what's there. Note the gaps at the end rather than blocking on them upfront.
- Do not summarize the task back to the user before producing the draft. Get to the artifact.
- Keep the closing note short — it is scaffolding, not content.
