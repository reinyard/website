---
title: Self-hosting
description: How Reinyard is put together and what running it involves.
---

Reinyard is self-hosted. The platform and its database run on infrastructure you control. Agents can still reach the services you grant them access to, such as Google Drive folders, which live outside your infrastructure.

## Architecture

| Component | Technology |
| --- | --- |
| Backend | Go |
| Database | SQLite or Postgres |
| Frontend | A small Go server |
| Execution | Docker Sandboxes (microVMs) |

SQLite is the simplest way to start. Postgres is the better fit when you want a shared, managed database.

## Requirements

Your hosts need Docker with support for Docker Sandboxes, since that is where every run executes.

:::note[Installation steps are coming]
Step-by-step installation instructions will be published with the first release. Until then this page describes the shape of a deployment.
:::

## Looking for the managed cloud?

If you would rather not operate it yourself, see [Managed cloud](/docs/cloud/).
