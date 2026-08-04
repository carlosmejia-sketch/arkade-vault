#!/usr/bin/env node
const path = require('path');
const fsp = require('fs');

let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', async () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const filePath = data.tool_input?.file_path || data.tool_response?.filePath;
  if (!filePath || !fsp.existsSync(filePath)) process.exit(0);

  const ext = path.extname(filePath).toLowerCase();
  const prettierExts = ['.ts', '.tsx', '.js', '.jsx', '.md', '.mdx', '.json', '.css'];
  const eslintExts = ['.ts', '.tsx', '.js', '.jsx'];

  if (prettierExts.includes(ext)) {
    try {
      const prettier = require('prettier');
      const config = (await prettier.resolveConfig(filePath)) || {};
      const original = fsp.readFileSync(filePath, 'utf8');
      const formatted = await prettier.format(original, { ...config, filepath: filePath });
      if (formatted !== original) fsp.writeFileSync(filePath, formatted);
    } catch {}
  }

  if (eslintExts.includes(ext)) {
    try {
      const { ESLint } = require('eslint');
      const eslint = new ESLint({ fix: true, cwd: path.resolve(__dirname, '..', '..') });
      const results = await eslint.lintFiles([filePath]);
      await ESLint.outputFixes(results);
    } catch {}
  }
});
