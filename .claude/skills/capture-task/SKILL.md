---
name: capture-task
description: Use this skill when the user wants to add, create, capture, or log a task in MiggyList. Trigger on phrases like "add a task", "create a task", "capture this", "log this", "I need to do X", "new task", or any request to create a new item in the app.
version: 0.1.0
---

# Capture Task

Capture a new task in MiggyList with enough context that an AI can assist with execution later.

## Workflow

1. **Clarify the task** — if not clear from the user's message, ask in one sentence what the task is.

2. **Ask targeted questions** — work through these conversationally, skipping any whose answer is already obvious. Do not ask them all at once.
   - What prompted this? What's the background or goal?
   - What does done look like? What are the concrete acceptance criteria?
   - Any constraints, blockers, dependencies, or relevant resources?

3. **Push back on vague "done when"** — this is the most important field for AI execution later. If the criteria aren't testable or concrete, ask for specifics before proceeding.

4. **Determine placement** — call `mcp__miggylist__list_boards` to see available boards. Ask which board this belongs on if not obvious from context. Default status is `Spark` unless the user indicates it's already in progress (`In Progress`) or just an idea to consider.

5. **Create the item** — call `mcp__miggylist__create_item` with:
   - A concise, action-oriented `title`
   - A structured `description` using the format below
   - Appropriate `status` and `priority`

## Description Format

```
## Context
Why this task exists — what prompted it, what problem it solves.

## Done when
Concrete, testable criteria. What finished looks like.

## Notes
Constraints, blockers, dependencies, related tasks, references, prior attempts.
```

Only include sections that have real content. Do not pad with placeholders or generic filler.

## Principles

- Ask questions one at a time, conversationally — not as a form
- If the user is in a hurry, capture at minimum a title and "done when", and note in the description that context is incomplete
- Keep the description factual and specific, not motivational
- Prefer a slightly over-specified description over an under-specified one — context is cheap to write and expensive to reconstruct later
