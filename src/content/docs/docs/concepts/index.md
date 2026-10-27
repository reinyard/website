---
title: Concepts
description: The few ideas that explain how Reinyard works.
---

Reinyard is built around a short chain of ideas. Each links to the next.

1. A **[pipeline](/docs/concepts/pipelines/)** describes what an agent does. It lives in Git.
2. Running a pipeline starts a **[sandbox](/docs/concepts/sandboxes/)**, an isolated environment that is removed afterwards.
3. The sandbox can reach only the data the agent has been granted: its **[access](/docs/concepts/access/)**.
4. What happened is stored as a **[run](/docs/concepts/runs/)**, tied to the exact version of the pipeline.
5. People work together in **[workspaces](/docs/concepts/workspaces/)**, with roles and invite-only sign-in.

If you remember one thing: **a run is always attributable to a version, and a sandbox only ever sees what it was given.**
