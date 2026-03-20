import { describe, it, expect } from 'bun:test';
import { parseString } from '../parser';

const SEARCH_ENGINE_YAML = `
name: Search Engine
actors:
  - name: user
views:
  - name: home
    components:
      - name: search_bar
        type: input
  - name: results
    components:
      - name: results_list
        type: list
paths:
  - from: home
    to: results
    actors:
      - user
`;

describe('parser', () => {
  it('parses the UI name', () => {
    const ui = parseString(SEARCH_ENGINE_YAML);
    expect(ui.name).toBe('Search Engine');
  });

  it('parses actors', () => {
    const ui = parseString(SEARCH_ENGINE_YAML);
    expect(Array.isArray(ui.actors)).toBe(true);
    expect((ui.actors as any[])[0].name).toBe('user');
  });

  it('parses views', () => {
    const ui = parseString(SEARCH_ENGINE_YAML);
    expect(ui.views).toHaveLength(2);
    expect(ui.views![0].name).toBe('home');
    expect(ui.views![1].name).toBe('results');
  });

  it('parses components within a view', () => {
    const ui = parseString(SEARCH_ENGINE_YAML);
    const home = ui.views![0];
    expect(home.components).toHaveLength(1);
    expect(home.components![0].name).toBe('search_bar');
    expect(home.components![0].type).toBe('input');
  });

  it('parses paths', () => {
    const ui = parseString(SEARCH_ENGINE_YAML);
    expect(ui.paths).toHaveLength(1);
    expect(ui.paths![0].from).toBe('home');
    expect(ui.paths![0].to).toBe('results');
    expect(ui.paths![0].actors).toContain('user');
  });
});
