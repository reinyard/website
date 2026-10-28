---
title: Introduction
description: What Reinyard is and how the documentation is organized.
---

Reinyard is a platform for building, versioning and running agents and automations in isolated sandboxes. Every change lives in Git and every run is on record.

The name is the idea: a _rein_ to guide and restrain, and a _yard_ to work in.

## What you get

- **Versioned agents.** An agent's pipeline lives in Git, with commits, branches and merges.
- **Isolated runs.** Pipelines execute in isolated sandboxes: Docker Sandboxes (microVMs) on-premises, Google sandboxes in the cloud. On-premises, each sandbox is removed afterwards and only the outputs come back.
- **A record of every run.** Logs, exit codes and generated files are kept and tied to the version that produced them.
- **Scoped access.** An agent can read only the folders it has been granted.
- **Team controls.** Invite-only sign-in, workspaces with roles, and administrators who can see and manage every workspace.
- **Visible health.** An overview of execution health and what needs attention next, built from your real run history.

## Where to go next

- New to the model? Start with [Concepts](/docs/concepts/).
- Want to run it? See [Self-hosting](/docs/self-hosting/).
- Evaluating it for your team? Read the [Security model](/docs/security/).

:::note[Early software]
Reinyard is under active development. These docs describe the product's design. Installation steps and reference material are added as releases are published.
:::
