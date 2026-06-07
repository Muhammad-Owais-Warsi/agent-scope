# agent-auth

Minimal LangChain + Gemini demo to verify `secureTool` behavior.

## Install

```bash
bun install
```

## Run

Set your API key, then run:

```bash
GOOGLE_API_KEY=your_key_here bun run index.ts
```

(or `bun run start`)

## What this demonstrates

`index.ts` creates two tools:

- `read_doc` (allowed)
- `admin_delete_user` (not allowed for this agent)

Both tools are wrapped by `createAgentAuth(...).secureTool(...)` from `core.ts`.

When the agent runs, it is prompted to call both tools. You should see:

- `read_doc` succeeds
- `admin_delete_user` throws `Permission Denied...`

That confirms secure tool gating is active.

## Production Readiness Checklist

We will ship this package in phases. This checklist is the source of truth and will be updated as work is completed.

### P0 (Must-have)

- [x] Fix config contract and validation
  - [x] Single schema: `agents: { id, permissions }[]`
  - [x] Reject duplicate agent IDs
  - [x] Reject empty/missing `id`
  - [x] Reject malformed permissions (non-array / empty entries)
- [ ] Deny-by-default behavior
  - [ ] Unknown agent always denied
  - [ ] Unknown tool ID always denied
  - [ ] Missing execution method throws clear error
- [ ] Immutable wrapping (no shared mutation side effects)
- [ ] Trusted identity binding (auth/session/JWT-backed agent identity)
- [ ] Anti-bypass integration guardrails
- [ ] Structured authorization decisions (allow/deny audit events)
- [ ] Error taxonomy
  - [ ] `UnknownAgentError`
  - [ ] `UnknownToolError`
  - [ ] `PermissionDeniedError`
  - [ ] `ToolExecutionMethodNotFoundError`
- [ ] Core test coverage
  - [ ] Allow path test
  - [ ] Deny path test
  - [ ] Unknown agent/tool tests
  - [ ] Multi-framework method tests (`execute`, `invoke`, `func`, `_call`)

### P1 (Strongly Recommended)

- [ ] Context-aware policy hooks
- [ ] Audit + observability metrics/correlation IDs
- [ ] Type-safe permission model
- [ ] Performance hardening (`Set`/benchmarks)
- [ ] Concurrency and reentrancy safety
- [ ] Versioned API + migration notes

### P2 (Product Polish)

- [ ] Example suite (LangChain, Vercel AI SDK, attack demo, multi-role matrix)
- [ ] Docs/UX polish and threat model section
- [ ] CI + release readiness (semver/changelog/security policy)
