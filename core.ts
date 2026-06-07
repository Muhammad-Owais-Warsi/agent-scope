interface AgentConfig {
  id: string;
  permissions: string[];
}
interface AgentScopeConfig {
  agents: AgentConfig[];
}

function validateAgentScopeConfig(config: AgentScopeConfig) {
  if (!config || typeof config !== "object") {
    throw new Error("AgentScope: config must be an object.");
  }

  if (!Array.isArray(config.agents)) {
    throw new Error("AgentScope: `agents` must be an array.");
  }

  const seenAgentIds = new Set<string>();

  for (let i = 0; i < config.agents.length; i++) {
    const agent = config.agents[i];

    if (!agent || typeof agent !== "object") {
      throw new Error(`AgentScope: agents[${i}] must be an object.`);
    }

    if (typeof agent.id !== "string" || agent.id.trim().length === 0) {
      throw new Error(
        `AgentScope: agents[${i}].id must be a non-empty string.`,
      );
    }

    if (seenAgentIds.has(agent.id)) {
      throw new Error(`AgentScope: duplicate agent id '${agent.id}'.`);
    }
    seenAgentIds.add(agent.id);

    if (!Array.isArray(agent.permissions)) {
      throw new Error(`AgentScope: agents[${i}].permissions must be an array.`);
    }

    for (let j = 0; j < agent.permissions.length; j++) {
      const permission = agent.permissions[j];
      if (typeof permission !== "string" || permission.trim().length === 0) {
        throw new Error(
          `AgentScope: agents[${i}].permissions[${j}] must be a non-empty string.`,
        );
      }
    }
  }
}

type ExecutionMethod = "invoke" | "func" | "execute" | "_call";

export class UnknownAgentError extends Error {
  constructor(agentId: string) {
    super(`Agent with ID ${agentId} not found.`);
    this.name = "UnknownAgentError";
  }
}

export class UnknownToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownToolError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(agentId: string, toolId: string) {
    super(
      `Agent with ID ${agentId} has no tool permission with name ${toolId}`,
    );
    this.name = "PermissionDeniedError";
  }
}

export class ToolExecutionMethodNotFoundError extends Error {
  constructor() {
    super(
      "AgentScope: Could not find an execution function (invoke/func/execute/_call) on tool.",
    );
    this.name = "ToolExecutionMethodNotFoundError";
  }
}

interface Tool {
  name?: string;
  id?: string;
  invoke?: (...args: any[]) => any;
  func?: (...args: any[]) => any;
  execute?: (...args: any[]) => any;
  [key: string]: any;
}

export function createAgentScope(config: AgentScopeConfig) {
  validateAgentScopeConfig(config);

  const knownToolIds = new Set(
    config.agents.flatMap((agent) => agent.permissions),
  );

  return {
    agent(agentId: string) {
      const currentAgent = config.agents.find((v) => v.id === agentId);

      if (!currentAgent) {
        throw new UnknownAgentError(agentId);
      }

      return {
        secureTool<T extends Tool>(tool: T, toolId?: string): T {
          const toolWithFallback = tool as T & {
            _call?: (...args: any[]) => any;
          };

          const method: ExecutionMethod | null =
            typeof tool.invoke === "function"
              ? "invoke"
              : typeof tool.func === "function"
                ? "func"
                : typeof tool.execute === "function"
                  ? "execute"
                  : typeof toolWithFallback._call === "function"
                    ? "_call"
                    : null;

          if (!method) {
            throw new ToolExecutionMethodNotFoundError();
          }

          const resolvedToolId = toolId ?? tool.name ?? tool.id;

          if (!resolvedToolId) {
            throw new UnknownToolError(
              "AgentScope: Missing tool id. Pass toolId explicitly or set tool.name/tool.id.",
            );
          }

          if (!knownToolIds.has(resolvedToolId)) {
            throw new UnknownToolError(
              `AgentScope: Unknown tool id '${resolvedToolId}' is denied by default.`,
            );
          }

          const sourceTool = tool as T & Record<string, any>;
          const executor = sourceTool[method] as (...args: any[]) => any;
          const original = executor.bind(tool) as (...args: any[]) => any;

          const wrappedTool = Object.create(Object.getPrototypeOf(tool)) as T &
            Record<string, any>;
          Object.defineProperties(
            wrappedTool,
            Object.getOwnPropertyDescriptors(tool),
          );

          const mutableWrappedTool = wrappedTool as Record<string, any>;

          mutableWrappedTool[method] = async (...args: any[]) => {
            const isValidTool =
              currentAgent.permissions.includes(resolvedToolId);

            if (!isValidTool) {
              throw new PermissionDeniedError(agentId, resolvedToolId);
            }

            return original(...args);
          };

          return wrappedTool;
        },
      };
    },
  };
}

// Backward-compatible alias
export const createAgentAuth = createAgentScope;
