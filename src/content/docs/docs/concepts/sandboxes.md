---
title: Sandboxes
description: How pipelines run in isolation.
---

When a pipeline runs, it runs inside a **Docker Sandbox**, a microVM created for that run.

## Lifecycle

1. A sandbox is created for the run.
2. The pipeline executes inside it, with only the access it has been granted.
3. Outputs are collected and returned.
4. The sandbox is removed.

The sandbox is removed after the run, and only the outputs come back.

## Why microVMs

A microVM gives a stronger boundary than a plain container while still starting quickly. That matters when every run gets a fresh one.
