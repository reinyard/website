---
title: Pipelines
description: How agents and automations are defined and versioned.
---

A pipeline is the definition of what an agent does. It is stored in Git, so it behaves like the rest of your code.

## Why Git

- Every change has an **author** and a **message**.
- Work can happen on **branches** and be reviewed before it is merged.
- Any earlier version can be recovered, compared or re-run.

Because runs are tied to the version that produced them (see [Runs](/docs/concepts/runs/)), history is not just about code. It explains behavior: when an agent starts acting differently, you can see which change made it so.

## Agents and automations

Reinyard does not require an agent to involve a model at all. A pipeline can be an automation, a data job or an agent. They are versioned, isolated and recorded the same way.
