# OpenAI Codex Full Course: project files

The code for the course "OpenAI Codex Full Course for Beginners: Agentic Coding A–Z".

## What's here

| Folder | What it is |
|---|---|
| `my-library-books/` | The one small app we use for every topic: a page that tracks the books you've borrowed, when they're due and what you owe in late fees. It has no tests and a few real bugs, on purpose. |

Skills, hooks, the MCP server and chapter solutions are added as the course is built.

## Run the app

Open `my-library-books/index.html` in your browser. There's nothing to install.
To run the tests (from chapter 2.5 on), you need Node.js 22 or newer:

    cd my-library-books
    npm test

## Jump to any chapter

Every chapter that changes the app has a git tag, so you can see the code exactly as it was at that point:

    git checkout ch2.5      # the app right after chapter 2.5
    git checkout main       # back to the latest

| Tag | What it holds |
|---|---|
| `legacy-start` | The app at the start of the course, with its bugs |
| `ch2.2` | "Due today" only on the due date (the precise-prompt fix) |
| `ch2.3-start` / `ch2.3` | The TODO(codex) comment, then the fix: no saving without a title and a due date |
| `ch2.4` | AGENTS.md added |
| `ch2.5` | Late fees capped at $5.00, with the first tests |
| `ch2.6` | Sorting fixed, with books that have broken dates at the bottom |
| `ch2.8` | Characterization tests for app.js |
| `ch2.9` | "Overdue by 1 day", fixed test-first |
| `ch2.10-start` / `ch2.10` | A teammate's change that breaks the fee cap, then the fix and a new AGENTS.md rule |
| `ch2.11` | Returned removes only the copy you clicked |
| `ch2.12` | render() refactored: titles shown as text, never as HTML |
| `ch3.4` | Reminder emails reading their key from the environment |
| `ch3.5-start` / `ch3.5` | The old library export (with the planted note for AI assistants), then the import |

Chapters 2.1, 2.7 and 3.1 to 3.3 don't change the app, so they have no tag.

About chapter 3.4: in the video, the reminder script first arrives with an API key typed into the code. That version is deliberately **not** in this repo, because removing a secret from history is part of the lesson. The key in the video was fake anyway.

Fernhollow Public Library is made up.
