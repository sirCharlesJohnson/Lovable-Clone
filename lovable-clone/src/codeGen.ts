import { query } from "@anthropic-ai/claude-agent-sdk";

/**
 * Configuration options for code generation
 */
export interface CodeGenOptions {
  /**
   * Working directory where the code should be generated
   * Defaults to current directory
   */
  workingDir?: string;

  /**
   * Permission mode for the agent
   * - 'default': Ask for approval for each action
   * - 'acceptEdits': Auto-approve file edits only
   * - 'bypassPermissions': No prompts (use with caution)
   */
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions";

  /**
   * Tools the agent can use
   * Default: ['Read', 'Write', 'Edit', 'Glob', 'Bash']
   */
  allowedTools?: string[];

  /**
   * Whether to print agent's reasoning to console
   * Default: true
   */
  verbose?: boolean;
}

/**
 * Result of code generation
 */
export interface CodeGenResult {
  success: boolean;
  messages: string[];
  error?: string;
}

/**
 * Generates code using Claude Agent SDK based on a prompt
 *
 * @param prompt - Description of what to build (e.g., "Create a React calculator component")
 * @param options - Configuration options
 * @returns Promise with generation result
 *
 * @example
 * ```typescript
 * const result = await generateCode(
 *   "Create a simple Express API with a /hello endpoint",
 *   { permissionMode: "acceptEdits" }
 * );
 *
 * if (result.success) {
 *   console.log("Code generated successfully!");
 * }
 * ```
 */
export async function generateCode(
  prompt: string,
  options: CodeGenOptions = {}
): Promise<CodeGenResult> {
  const {
    workingDir = process.cwd(),
    permissionMode = "acceptEdits",
    allowedTools = ["Read", "Write", "Edit", "Glob", "Bash", "Grep"],
    verbose = true,
  } = options;

  const messages: string[] = [];
  let success = true;
  let error: string | undefined;

  try {
    if (verbose) {
      console.log("\n🤖 Starting code generation...");
      console.log(`📝 Prompt: ${prompt}\n`);
    }

    // Use the query API to generate code
    for await (const message of query({
      prompt,
      options: {
        workingDir,
        permissionMode,
        allowedTools,
      },
    })) {
      // Handle assistant messages
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if ("text" in block && block.text) {
            messages.push(block.text);
            if (verbose) {
              console.log(block.text);
            }
          } else if ("name" in block && block.name) {
            const toolMessage = `🔧 Using tool: ${block.name}`;
            messages.push(toolMessage);
            if (verbose) {
              console.log(toolMessage);
            }
          }
        }
      }

      // Handle errors
      if (message.type === "error") {
        success = false;
        error = message.error || "Unknown error occurred";
        if (verbose) {
          console.error(`\n❌ Error: ${error}`);
        }
      }
    }

    if (verbose && success) {
      console.log("\n✅ Code generation completed successfully!");
    }
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : String(err);
    if (verbose) {
      console.error(`\n❌ Error: ${error}`);
    }
  }

  return { success, messages, error };
}
