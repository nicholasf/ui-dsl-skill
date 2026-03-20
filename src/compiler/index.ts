import { parse } from './parser';
import { compile as compileMermaid } from './targets/mermaid';
import { compile as compileReact } from './targets/react';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const USAGE = 'Usage: bun run src/compiler/index.ts <input.yaml> <target: mermaid|react> [output]';

const [,, inputFile, target, outputArg] = process.argv;

if (!inputFile || !target) {
  console.error(USAGE);
  process.exit(1);
}

const ui = parse(inputFile);

if (target === 'mermaid') {
  const output = compileMermaid(ui);
  if (outputArg) {
    writeFileSync(outputArg, output, 'utf-8');
    console.log(`Mermaid diagram written to ${outputArg}`);
  } else {
    console.log(output);
  }
} else if (target === 'react') {
  const files = compileReact(ui);
  const outDir = outputArg ?? 'output';
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = `${outDir}/${filePath}`;
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
    console.log(`Written: ${fullPath}`);
  }
  console.log(`\nReact app scaffolded in ${outDir}/`);
  console.log(`Run: cd ${outDir} && pnpm install && pnpm dev`);
} else {
  console.error(`Unknown target: ${target}. Supported targets: mermaid, react`);
  console.error(USAGE);
  process.exit(1);
}
