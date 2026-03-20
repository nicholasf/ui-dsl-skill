import { describe, it, expect } from 'bun:test';
import { compile } from '../targets/react';
import type { UI } from '../types';

const searchUI: UI = {
  name: 'Search Engine',
  actors: [{ name: 'user' }],
  views: [
    {
      name: 'home',
      annotation: { note: 'Landing page with search input' },
      components: [
        { name: 'search_bar', type: 'input', annotation: { note: 'Search query input' } },
        { name: 'search_button', type: 'button' },
      ],
    },
    {
      name: 'results',
      components: [
        { name: 'results_list', type: 'list' },
      ],
    },
  ],
  paths: [
    {
      from: 'home',
      to: 'results',
      actors: ['user'],
      trigger: { component: 'search_bar', on: 'submit' },
      params: [{ name: 'query', from: 'search_bar' }],
    },
  ],
};

describe('react compiler scaffold', () => {
  it('generates a package.json', () => {
    const files = compile(searchUI);
    expect(files['package.json']).toBeDefined();
    const pkg = JSON.parse(files['package.json']);
    expect(pkg.name).toBe('search-engine');
    expect(pkg.dependencies['react']).toBeDefined();
    expect(pkg.dependencies['react-router-dom']).toBeDefined();
  });

  it('generates an index.html', () => {
    const files = compile(searchUI);
    expect(files['index.html']).toBeDefined();
    expect(files['index.html']).toContain('Search Engine');
    expect(files['index.html']).toContain('/src/main.tsx');
  });

  it('generates a vite.config.ts', () => {
    const files = compile(searchUI);
    expect(files['vite.config.ts']).toBeDefined();
    expect(files['vite.config.ts']).toContain('@vitejs/plugin-react');
  });

  it('generates a tsconfig.json', () => {
    const files = compile(searchUI);
    expect(files['tsconfig.json']).toBeDefined();
    const tsconfig = JSON.parse(files['tsconfig.json']);
    expect(tsconfig.compilerOptions.jsx).toBe('react-jsx');
  });

  it('generates src/main.tsx', () => {
    const files = compile(searchUI);
    expect(files['src/main.tsx']).toBeDefined();
    expect(files['src/main.tsx']).toContain('createRoot');
  });
});

describe('react compiler', () => {
  it('generates an App.tsx file', () => {
    const files = compile(searchUI);
    expect(files['src/App.tsx']).toBeDefined();
  });

  it('App.tsx includes imports for each view', () => {
    const files = compile(searchUI);
    expect(files['src/App.tsx']).toContain("import { Home }");
    expect(files['src/App.tsx']).toContain("import { Results }");
  });

  it('App.tsx includes routes for each view', () => {
    const files = compile(searchUI);
    expect(files['src/App.tsx']).toContain('path="/home"');
    expect(files['src/App.tsx']).toContain('path="/results"');
  });

  it('generates a file for each view', () => {
    const files = compile(searchUI);
    expect(files['src/views/Home.tsx']).toBeDefined();
    expect(files['src/views/Results.tsx']).toBeDefined();
  });

  it('view file contains component placeholders', () => {
    const files = compile(searchUI);
    expect(files['src/views/Home.tsx']).toContain('data-component="search_bar"');
    expect(files['src/views/Home.tsx']).toContain('data-component="search_button"');
  });

  it('view file includes annotation as a comment', () => {
    const files = compile(searchUI);
    expect(files['src/views/Home.tsx']).toContain('Landing page with search input');
  });

  it('component annotation is included as a comment', () => {
    const files = compile(searchUI);
    expect(files['src/views/Home.tsx']).toContain('Search query input');
  });
});

describe('react compiler triggers and params', () => {
  it('view with a trigger imports useNavigate', () => {
    const files = compile(searchUI);
    expect(files['src/views/Home.tsx']).toContain('useNavigate');
  });

  it('triggered input has an onKeyDown handler for submit', () => {
    const files = compile(searchUI);
    expect(files['src/views/Home.tsx']).toContain("onKeyDown");
    expect(files['src/views/Home.tsx']).toContain("Enter");
  });

  it('navigation target includes query param', () => {
    const files = compile(searchUI);
    expect(files['src/views/Home.tsx']).toContain('/results');
    expect(files['src/views/Home.tsx']).toContain('query=');
  });

  it('view without outgoing triggers does not import useNavigate', () => {
    const files = compile(searchUI);
    expect(files['src/views/Results.tsx']).not.toContain('useNavigate');
  });
});
