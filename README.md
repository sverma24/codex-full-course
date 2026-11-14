# OpenAI Codex Full Course: project files

The code for the course "OpenAI Codex Full Course for Beginners: Agentic Coding A–Z".

## What's here

| Folder | What it is |
|---|---|
| `fernhollow-library/` | The legacy app we work on in Parts 2–5: holds, loans, fines and study-room booking for Fernhollow Public Library, a fictional small-town library in Vermont. It has no tests and a few real bugs, on purpose. |

More folders (the capstone, skills, hooks, the MCP server and chapter solutions) are added as the course is built.

## Run the library app

You need Node.js 22.13 or newer. The app uses Node's built-in SQLite, so there's nothing native to compile.

    cd fernhollow-library
    npm install
    npm run seed
    npm start        # http://localhost:3000

The tag `legacy-start` is the app exactly as it is at the start of the course, so you can always go back to it:

    git checkout legacy-start

Fernhollow Public Library and everyone in its data are made up. Phone numbers use the 555-01xx range and emails use example.com.
