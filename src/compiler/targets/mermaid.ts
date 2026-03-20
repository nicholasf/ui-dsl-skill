import type { UI, Path } from '../types';

function sanitize(name: string): string {
  return name.replace(/\s+/g, '_');
}

function edgeLabel(path: Path): string {
  if (path.actors && path.actors.length > 0) {
    return `|${path.actors.join(', ')}|`;
  }
  return '';
}

export function compile(ui: UI): string {
  const lines: string[] = ['flowchart LR'];

  // Nodes from views
  if (ui.views) {
    for (const view of ui.views) {
      const id = sanitize(view.name);
      const label = view.annotation ? `"${view.name}\\n(${view.annotation.note})"` : `"${view.name}"`;
      lines.push(`  ${id}[${label}]`);
    }
  }

  lines.push('');

  // Edges from paths
  if (ui.paths) {
    for (const path of ui.paths) {
      const from = sanitize(path.from);
      const to = sanitize(path.to);
      const label = edgeLabel(path);
      if (path.acl?.roles) {
        lines.push(`  %% roles: ${path.acl.roles.join(', ')}`);
      }
      lines.push(`  ${from} -->${label} ${to}`);
    }
  }

  return lines.join('\n');
}
