<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="https://peerlist.io/api/v1/projects/embed/PRJH8OERPAK7RDE8G17LNQLGE69MM6?showUpvote=false&theme=dark"
  />
  <source
    media="(prefers-color-scheme: light)"
    srcset="https://peerlist.io/api/v1/projects/embed/PRJH8OERPAK7RDE8G17LNQLGE69MM6?showUpvote=false&theme=light"
  />
  <img
    alt="Agent Scope"
    src="https://peerlist.io/api/v1/projects/embed/PRJH8OERPAK7RDE8G17LNQLGE69MM6?showUpvote=false&theme=light"
    height="72"
  />
</picture>
      
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
