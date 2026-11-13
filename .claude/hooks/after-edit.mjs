// PostToolUse: after an edit in src/ or scripts/, run the project rules.
// A failure is shown to Claude (exit 2) so it fixes the cause straight away.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
let raw = ''; process.stdin.on('data', d => raw += d).on('end', () => {
  let p = ''; try { p = JSON.parse(raw).tool_input?.file_path || ''; } catch {}
  if (!/[\\/](src|scripts)[\\/]/.test(p)) return;
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try { execFileSync(process.execPath, [path.join(dir, 'scripts/check.mjs'), '--quick'], { stdio: 'pipe' }); }
  catch (e) { console.error(String(e.stderr || e.stdout)); process.exit(2); }
});
