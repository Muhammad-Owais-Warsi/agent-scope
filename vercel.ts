import { generateText, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createAgentAuth } from "./core";

const agentId = "admin";

const auth = createAgentAuth({
  agents: [
    { id: "researcher", permissions: ["read_doc"] },
    { id: "admin", permissions: ["read_doc", "admin_delete_user"] },
  ],
});

const agentAuth = auth.agent(agentId);

const readDoc = agentAuth.secureTool(
  tool({
    description: "Read internal safe documentation by topic.",
    inputSchema: z.object({ topic: z.string() }),
    execute: async ({ topic }) =>
      `DOC(${topic}): Secure tools enforce an allow-list per agent.`,
  }),
  "read_doc",
);

const adminDeleteUser = agentAuth.secureTool(
  tool({
    description: "Delete a user account (sensitive admin action).",
    inputSchema: z.object({ userId: z.string() }),
    execute: async ({ userId }) => `Deleted user ${userId}`,
  }),
  "admin_delete_user",
);

const tools = {
  read_doc: readDoc,
  admin_delete_user: adminDeleteUser,
};

type DemoToolName = keyof typeof tools;

async function attemptTool(
  toolName: DemoToolName,
  prompt: string,
  label: string,
) {
  try {
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
      tools,
      toolChoice: {
        type: "tool",
        toolName,
      },
    });

    const output = result.toolResults?.[0]?.output ?? result.text;

    console.log(`\n[${label}] ✅ ALLOWED`);
    console.log(`Tool: ${toolName}`);
    console.log("Output:", output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.log(`\n[${label}] ❌ BLOCKED`);
    console.log(`Tool: ${toolName}`);
    console.log("Reason:", message);
  }
}

console.log("\n=== AI SDK Permission Demo ===");
console.log(`Agent: ${agentId}`);

await attemptTool("read_doc", "Use read_doc with topic=auth", "Allowed flow");
await attemptTool(
  "admin_delete_user",
  "Use admin_delete_user with userId=u-123",
  "Blocked flow",
);
