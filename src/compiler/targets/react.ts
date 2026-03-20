import type { UI, View, Component, Path } from '../types';

function sanitize(name: string): string {
  return name.replace(/\s+/g, '_');
}

function toPascalCase(name: string): string {
  return sanitize(name)
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function elementForType(type: string, name: string, handlers: string, controlled: boolean): string {
  switch (type) {
    case 'input':
      return controlled
        ? `<input data-component="${name}" placeholder="${name}"${handlers} onChange={e => setValues(v => ({ ...v, ${name}: e.target.value }))} value={values.${name} ?? ''} />`
        : `<input data-component="${name}" placeholder="${name}"${handlers} />`;
    case 'button':
      return `<button data-component="${name}"${handlers}>${name}</button>`;
    case 'list':
      return `<ul data-component="${name}"${handlers}><li>(placeholder)</li></ul>`;
    case 'embed':
      return `<iframe data-component="${name}" title="${name}"${handlers} />`;
    default:
      return `<div data-component="${name}" data-type="${type}"${handlers} />`;
  }
}

function compileComponent(component: Component, handlers: string, paramSources: Set<string>): string {
  const note = component.annotation ? `  {/* ${component.annotation.note} */}\n  ` : '  ';
  const aclComment = component.acl?.roles
    ? `  {/* ACL: roles=[${component.acl.roles.join(', ')}] */}\n  `
    : '';
  const controlled = component.type === 'input' && paramSources.has(component.name);
  return `${aclComment}${note}${elementForType(component.type, component.name, handlers, controlled)}`;
}

function buildHandlers(component: Component, outgoing: Path[]): string {
  const triggered = outgoing.filter(p => p.trigger?.component === component.name);
  if (triggered.length === 0) return '';

  return triggered.map(path => {
    const params = path.params ?? [];
    const queryParts = params
      .map(p => `'${p.name}=' + encodeURIComponent(values.${p.from} || '')`)
      .join(" + '&' + ");
    const query = queryParts.length > 0 ? ` + '?' + ${queryParts}` : '';
    const dest = `'/${sanitize(path.to)}'${query}`;

    if (path.trigger!.on === 'submit') {
      return ` onKeyDown={(e) => { if (e.key === 'Enter') { navigate(${dest}); } }}`;
    }
    if (path.trigger!.on === 'click') {
      return ` onClick={() => { navigate(${dest}); }}`;
    }
    if (path.trigger!.on === 'change') {
      return ` onChange={() => { navigate(${dest}); }}`;
    }
    return '';
  }).join('');
}

function compileView(view: View, outgoing: Path[]): string {
  const componentName = toPascalCase(view.name);
  const aclComment = view.acl?.roles
    ? `// ACL: roles=[${view.acl.roles.join(', ')}]\n`
    : '';
  const viewNote = view.annotation ? `// ${view.annotation.note}\n` : '';

  const needsRouter = outgoing.some(p => p.trigger);
  const routerImport = needsRouter ? `import { useNavigate } from 'react-router-dom';\n` : '';
  const navigateHook = needsRouter ? `\n  const navigate = useNavigate();` : '';

  // Only track state for inputs referenced in outgoing params
  const paramSources = new Set(outgoing.flatMap(p => p.params?.map(param => param.from) ?? []));
  const needsState = (view.components ?? []).some(c => c.type === 'input' && paramSources.has(c.name));
  const stateImport = needsState ? `import { useState } from 'react';\n` : '';
  const stateHook = needsState
    ? `\n  const [values, setValues] = useState<Record<string, string>>({});`
    : '';

  const components = view.components
    ?.map(c => compileComponent(c, buildHandlers(c, outgoing), paramSources))
    .join('\n  ') ?? '';

  return `${stateImport}${routerImport}
${aclComment}${viewNote}export function ${componentName}() {${navigateHook}${stateHook}
  return (
    <div className="view" data-view="${view.name}">
      ${components}
    </div>
  );
}
`;
}

function compileRouter(ui: UI): string {
  const views = ui.views ?? [];
  const imports = views
    .map(v => `import { ${toPascalCase(v.name)} } from './views/${toPascalCase(v.name)}';`)
    .join('\n');

  const firstPath = views.length > 0 ? `/${sanitize(views[0].name)}` : '/';
  const routes = views
    .map(v => `      <Route path="/${sanitize(v.name)}" element={<${toPascalCase(v.name)} />} />`)
    .join('\n');

  return `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
${imports}

// Generated from UI spec: ${ui.name}
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="${firstPath}" replace />} />
${routes}
      </Routes>
    </BrowserRouter>
  );
}
`;
}

function compilePackageJson(ui: UI): string {
  const pkgName = sanitize(ui.name).toLowerCase().replace(/_/g, '-');
  return JSON.stringify(
    {
      name: pkgName,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        'react-router-dom': '^6.28.0',
      },
      devDependencies: {
        '@types/react': '^18.3.12',
        '@types/react-dom': '^18.3.1',
        '@vitejs/plugin-react': '^4.3.4',
        typescript: '^5.6.3',
        vite: '^6.0.5',
      },
    },
    null,
    2
  ) + '\n';
}

function compileIndexHtml(ui: UI): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ui.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function compileViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}

function compileTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        isolatedModules: true,
        moduleDetection: 'force',
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
    },
    null,
    2
  ) + '\n';
}

function compileMain(): string {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;
}

export function compile(ui: UI): Record<string, string> {
  const files: Record<string, string> = {};

  files['package.json'] = compilePackageJson(ui);
  files['index.html'] = compileIndexHtml(ui);
  files['vite.config.ts'] = compileViteConfig();
  files['tsconfig.json'] = compileTsConfig();
  files['src/main.tsx'] = compileMain();
  files['src/App.tsx'] = compileRouter(ui);

  const paths = ui.paths ?? [];
  for (const view of ui.views ?? []) {
    const outgoing = paths.filter(p => p.from === view.name);
    const name = toPascalCase(view.name);
    files[`src/views/${name}.tsx`] = compileView(view, outgoing);
  }

  return files;
}
