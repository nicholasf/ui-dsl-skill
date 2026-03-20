import { describe, it, expect } from 'bun:test';
import { compile } from '../targets/mermaid';
import type { UI } from '../types';

const wikiUI: UI = {
  name: 'Wiki',
  actors: [{ name: 'admin' }, { name: 'reader' }],
  views: [
    { name: 'wiki_page_view' },
    { name: 'wiki_page_edit', acl: { roles: ['admin'] } },
    { name: 'wiki_page_updated' },
  ],
  paths: [
    { from: 'wiki_page_view', to: 'wiki_page_edit', actors: ['admin'], acl: { roles: ['admin'] } },
    { from: 'wiki_page_edit', to: 'wiki_page_updated', actors: ['admin'], acl: { roles: ['admin'] } },
  ],
};

describe('mermaid compiler', () => {
  it('outputs a flowchart header', () => {
    const output = compile(wikiUI);
    expect(output).toMatch(/^flowchart LR/);
  });

  it('renders each view as a node', () => {
    const output = compile(wikiUI);
    expect(output).toContain('wiki_page_view');
    expect(output).toContain('wiki_page_edit');
    expect(output).toContain('wiki_page_updated');
  });

  it('renders paths as edges with actor labels', () => {
    const output = compile(wikiUI);
    expect(output).toContain('wiki_page_view -->|admin| wiki_page_edit');
    expect(output).toContain('wiki_page_edit -->|admin| wiki_page_updated');
  });

  it('annotates edges with ACL roles as comments on their own line', () => {
    const output = compile(wikiUI);
    expect(output).toMatch(/^\s+%% roles: admin/m);
  });
});
