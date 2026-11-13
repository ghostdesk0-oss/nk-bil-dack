// PreToolUse: refuse edits to build output. Exit code 2 sends the message back to Claude.
let raw = ''; process.stdin.on('data', d => raw += d).on('end', () => {
  let p = ''; try { p = JSON.parse(raw).tool_input?.file_path || ''; } catch {}
  if (/[\\/]dist[\\/]/.test(p)) { console.error('dist/ is build output. Edit the files in src/ and run npm run build.'); process.exit(2); }
});
