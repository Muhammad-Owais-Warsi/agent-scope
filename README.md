# agent-scope

A security layer that ensures agents can only use the tools they're explicitly allowed to access.

## Install

```bash
bun add agents-scope
```

## Usage

```ts
import { createAgentScope } from "agents-scope";

const scope = createAgentScope({
  agents: [
    { id: "researcher", permissions: ["read_doc"] },
    { id: "admin", permissions: ["read_doc", "admin_delete_user"] },
  ],
});

// pass the tool and tool_id
const secureTool = scope.agent("researcher").secureTool(tool, "read_doc");
```

**Any attempt by the research agent to execute `admin_delete_user` will be blocked.**
