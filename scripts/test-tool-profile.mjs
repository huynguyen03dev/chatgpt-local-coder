/**
 * Verify slim tool profile stays intentionally small and exposes only the
 * primitives used by the ChatGPT local coding workflow.
 */
import { SLIM_CHATGPT_TOOLS, shouldExposeTool } from "../dist/lib/tool-profile.js";

let passed = 0;
let failed = 0;
function ok(m) { console.log(`OK  ${m}`); passed++; }
function fail(m, e) { console.error(`FAIL ${m}: ${e}`); failed++; }

try {
  const required = [
    "read_text_file", "read_image", "write_file", "apply_patch",
    "run_command", "shell_status", "start_process", "process_output",
    "project_context", "list_skills", "load_skill", "rewind",
  ];
  const actual = [...SLIM_CHATGPT_TOOLS];
  if (actual.length !== required.length || required.some((tool) => !SLIM_CHATGPT_TOOLS.has(tool))) {
    throw new Error(`slim set mismatch: expected ${required.join(", ")}; got ${actual.join(", ")}`);
  }
  for (const tool of required) {
    if (!shouldExposeTool(tool, "slim")) throw new Error(`${tool} missing from slim`);
  }
  ok(`slim profile exposes exactly ${required.length} expected tools`);

  const redundant = [
    "edit_file", "multi_edit", "list_directory", "glob", "grep",
    "git_status", "git_diff", "git_add", "git_commit", "git_restore",
    "agent_status", "remember", "load_path_rules", "node_repl", "ponytail_turn", "mcp_servers",
  ];
  for (const tool of redundant) {
    if (shouldExposeTool(tool, "slim")) throw new Error(`${tool} should be hidden in slim`);
  }
  ok("redundant wrappers hidden in slim");

  if (!shouldExposeTool("mcp_call", "full")) throw new Error("full should expose all registered tools");
  ok("full profile still exposes registered tools");
} catch (e) {
  fail("tool profile", e.message || e);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
