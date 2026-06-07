# agent-scope

A security layer that ensures agents can only use the tools they're explicitly allowed to access.

## Install

```bash
bun add agent-scope
```

## Usage

```ts
import { createAgentScope } from "agent-scope";

const scope = createAgentScope({
  agents: [
    { id: "researcher", permissions: ["read_doc"] },
    { id: "admin", permissions: ["read_doc", "admin_delete_user"] },
  ],
});

// pass the tool and tool_id
const secureTool = scope.agent("admin").secureTool(tool, "read_doc");
```

`secureTool` supports tools that execute via `invoke`, `func`, `execute`, or `_call`.
