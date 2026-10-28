---
title: Security model
description: What Reinyard protects, how, and where its limits are.
---

This page states the design plainly, including what is not yet covered.

## What the design provides

- **Isolation.** Every run executes in its own sandbox: a Docker Sandbox (microVM) on-premises, a Google sandbox in the cloud. On-premises, the sandbox is removed afterwards and only outputs come back.
- **Scoped access.** Agents read only the folders they have been granted.
- **Invite-only sign-in.** Accounts exist only for people who were invited.
- **Attribution.** Every run is recorded against the exact version of the pipeline that produced it.

## Things to know

- **Administrators see everything.** An administrator can see and manage every workspace.
- **Isolation limits the blast radius, it does not make a pipeline safe.** An agent can do whatever its code and its granted access allow. Grant the narrowest scope that lets it do its job.
- **Not yet for public multi-tenant hosting.** Reinyard is under active development and is not ready to be offered as a shared service to untrusted tenants. Run it for your own organization.

## Reporting a vulnerability

Please report security issues privately to [security@reinyard.com](mailto:security@reinyard.com). Do not open a public issue.
