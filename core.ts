interface AgentConfig {
  id: string;
  permissions: string[];
}
interface AgentAuthConfig {
  agents: AgentConfig[];
}

function validateAgentAuthConfig(config: AgentAuthConfig) {
  if (!config || typeof config !== "object") {
    throw new Error("AgentAuth: config must be an object.");
  }

  if (!Array.isArray(config.agents)) {
    throw new Error("AgentAuth: `agents` must be an array.");
  }

  const seenAgentIds = new Set<string>();

  for (let i = 0; i < config.agents.length; i++) {
    const agent = config.agents[i];

    if (!agent || typeof agent !== "object") {
      throw new Error(`AgentAuth: agents[${i}] must be an object.`);
    }

    if (typeof agent.id !== "string" || agent.id.trim().length === 0) {
      throw new Error(`AgentAuth: agents[${i}].id must be a non-empty string.`);
    }

    if (seenAgentIds.has(agent.id)) {
      throw new Error(`AgentAuth: duplicate agent id '${agent.id}'.`);
    }
    seenAgentIds.add(agent.id);

    if (!Array.isArray(agent.permissions)) {
      throw new Error(`AgentAuth: agents[${i}].permissions must be an array.`);
    }

    for (let j = 0; j < agent.permissions.length; j++) {
      const permission = agent.permissions[j];
      if (typeof permission !== "string" || permission.trim().length === 0) {
        throw new Error(
          `AgentAuth: agents[${i}].permissions[${j}] must be a non-empty string.`,
        );
      }
    }
  }
}

type ExecutionMethod = "invoke" | "func" | "execute" | "_call";

interface Tool {
  name?: string;
  id?: string;
  invoke?: (...args: any[]) => any;
  func?: (...args: any[]) => any;
  execute?: (...args: any[]) => any;
  _call?: (...args: any[]) => any;
  [key: string]: any;
}

export function createAgentAuth(config: AgentAuthConfig) {
  validateAgentAuthConfig(config);

  return {
    agent(agentId: string) {
      const currentAgent = config.agents.find((v) => v.id === agentId);

      if (!currentAgent) {
        throw new Error(`Agent with ID ${agentId} not found.`);
      }

      return {
        secureTool<T extends Tool>(tool: T, toolId?: string): T {
          const method: ExecutionMethod | null =
            typeof tool.invoke === "function"
              ? "invoke"
              : typeof tool.func === "function"
                ? "func"
                : typeof tool.execute === "function"
                  ? "execute"
                  : typeof tool._call === "function"
                    ? "_call"
                    : null;

          if (!method) {
            throw new Error(
              "AgentAuth: Could not find an execution function (invoke/func/execute/_call) on tool.",
            );
          }

          const resolvedToolId = toolId ?? tool.name ?? tool.id;

          if (!resolvedToolId) {
            throw new Error(
              "AgentAuth: Missing tool id. Pass toolId explicitly or set tool.name/tool.id.",
            );
          }

          const mutableTool = tool as T & Record<string, any>;
          const executor = mutableTool[method] as (...args: any[]) => any;
          const original = executor.bind(tool) as (...args: any[]) => any;

          mutableTool[method] = async (...args: any[]) => {
            const isValidTool =
              currentAgent.permissions.includes(resolvedToolId);

            if (!isValidTool) {
              throw new Error(
                `Agent with ID ${agentId} has no tool permission with name ${resolvedToolId}`,
              );
            }

            return original(...args);
          };

          return tool;
        },
      };
    },
  };
}
