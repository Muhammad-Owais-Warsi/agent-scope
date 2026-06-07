import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createAgentAuth } from "./core";

const agentId = "researcher";

const auth = createAgentAuth({
  agents: [
    {
      id: "researcher",
      permissions: ["read_doc"],
    },
    {
      id: "admin",
      permissions: ["read_doc", "admin_delete_user"],
    },
  ],
});

const read_doc_tool = new DynamicStructuredTool({
  name: "read_doc",
  description: "Read internal safe documentation by topic.",
  schema: z.object({ topic: z.string() }),
  func: async (input) => {
    const { topic } = input as { topic: string };
    return `DOC(${topic}): Secure tools enforce an allow-list per agent.`;
  },
});

const admin_delete_user_tool = new DynamicStructuredTool({
  name: "admin_delete_user",
  description: "Delete a user account (sensitive admin action).",
  schema: z.object({ userId: z.string() }),
  func: async (input) => {
    const { userId } = input as { userId: string };
    return `Deleted user ${userId}`;
  },
});

const agentAuth = auth.agent(agentId);

const readDocTool = agentAuth.secureTool(read_doc_tool, "read_doc");
const adminDeleteUserTool = agentAuth.secureTool(
  admin_delete_user_tool,
  "admin_delete_user",
);

const tools = [readDocTool, adminDeleteUserTool];
const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

async function runMinimalAgent(userInput: string) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY in environment");
  }

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    apiKey,
  });

  const modelWithTools = model.bindTools(tools);

  const messages: Array<HumanMessage | AIMessage | ToolMessage> = [
    new HumanMessage(userInput),
  ];

  for (let step = 0; step < 4; step++) {
    const aiMessage = await modelWithTools.invoke(messages);
    messages.push(aiMessage);

    if (!aiMessage.tool_calls?.length) {
      return aiMessage.content;
    }

    for (const call of aiMessage.tool_calls) {
      const tool = toolMap.get(call.name as string);

      if (!tool) {
        messages.push(
          new ToolMessage({
            tool_call_id: call.id ?? call.name,
            content: `Unknown tool: ${call.name}`,
          }),
        );
        continue;
      }

      try {
        const result = await tool.invoke(call.args);
        messages.push(
          new ToolMessage({
            tool_call_id: call.id ?? call.name,
            content: String(result),
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        messages.push(
          new ToolMessage({
            tool_call_id: call.id ?? call.name,
            content: `TOOL_ERROR: ${message}`,
          }),
        );
      }
    }
  }

  return "Agent stopped after max steps without a final answer.";
}

const prompt = [
  "Use read_doc with topic=auth.",
  "Then try admin_delete_user with userId=u-123.",
  "Report the result of both tool calls.",
].join(" ");

runMinimalAgent(prompt)
  .then((final) => {
    console.log("\n=== Agent Final Response ===");
    console.log(final);
    console.log("\nExpected: read_doc succeeds, admin_delete_user is blocked.");
  })
  .catch((error) => {
    console.error("Agent run failed:", error);
    process.exitCode = 1;
  });
