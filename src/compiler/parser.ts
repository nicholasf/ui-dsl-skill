import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { UI } from './types';

export function parse(filePath: string): UI {
  const content = readFileSync(filePath, 'utf-8');
  return parseYaml(content) as UI;
}

export function parseString(content: string): UI {
  return parseYaml(content) as UI;
}
