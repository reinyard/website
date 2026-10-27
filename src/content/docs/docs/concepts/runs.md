---
title: Runs and records
description: What Reinyard keeps about every execution.
---

Every execution of a pipeline is a **run**, and every run leaves a **record**.

## What a record contains

- The **logs** the run produced.
- The **exit code**.
- Any **files** it generated.
- The **version** of the pipeline that ran.

The last point is the important one. Because the record names the exact version, you can answer questions like "which change caused this?" without guessing.

## Visibility

The overview shows execution health and what needs attention next. It is computed from your real run history, so it reflects what happened rather than what was expected to happen.
