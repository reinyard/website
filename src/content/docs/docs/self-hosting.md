---
title: Self-hosting
description: How Reinyard is put together and what running it involves.
---

Reinyard runs on-premises: the platform and its database run on infrastructure you control. (The managed cloud and hybrid deployments are covered below.) Agents can still reach the services you grant them access to, which live outside your infrastructure.

## Architecture

This is the on-premises deployment. In the cloud, runs execute in Google sandboxes instead of Docker Sandboxes.

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

If you would rather not operate it yourself, or want a hybrid setup, see [Managed cloud](/docs/cloud/).
