---
title: Scoped access
description: How an agent is limited to the data it needs.
---

An agent starts with no access. It can read only what has been explicitly granted to it.

## Folders

Access is granted **per folder**. An agent can read the folders it has been given and nothing else. Granting one folder does not expose its siblings or its parents.

## Principles

- **Least access.** Grant the narrowest scope that lets the agent do its job.
- **Per agent.** Access is granted to each agent individually.
- **Visible.** What an agent can reach is part of its configuration, not a side effect.
