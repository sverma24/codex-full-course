---
name: fix-bug-safely
description: Fix a reported bug in my-library-books with a failing regression test and a minimal code change.
---

1. Restate the bug in one sentence.
2. Trace the behavior to the responsible code. Check `books.js` for library rules and `app.js` for page behavior.
3. Add a regression test for the expected behavior and run it. Verify it fails for the reported bug before changing production code.
4. Make the smallest fix that addresses the cause and preserves unrelated behavior.
5. Run `npm test` from the project root and verify the regression test and full suite pass.
6. Finish with exactly three lines labeled **Cause**, **Fix**, and **Test**. Report the actual test result.
