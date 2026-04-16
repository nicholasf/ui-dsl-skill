import { describe, it, expect } from 'bun:test';
import { compile } from '../targets/expo';
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

const wikiUI: UI = {
  name: 'Wiki',
  actors: [{ name: 'admin' }, { name: 'reader' }],
  views: [
    {
      name: 'wiki_page_view',
      annotation: { note: 'Displays the content of a wiki page' },
      components: [
        { name: 'page_content', type: 'richtext' },
        { name: 'edit_menu', type: 'menu', acl: { roles: ['admin'] } },
      ],
    },
    {
      name: 'wiki_page_edit',
      acl: { roles: ['admin'] },
      components: [
        { name: 'content_form', type: 'form' },
        { name: 'save_button', type: 'button' },
      ],
    },
  ],
  paths: [
    {
      from: 'wiki_page_view',
      to: 'wiki_page_edit',
      actors: ['admin'],
      trigger: { component: 'edit_menu', on: 'click' },
      acl: { roles: ['admin'] },
    },
    {
      from: 'wiki_page_edit',
      to: 'wiki_page_view',
      actors: ['admin'],
      trigger: { component: 'save_button', on: 'click' },
    },
  ],
};

// searchUI: 2 screens + package.json + tsconfig.json + app.json + app/_layout.tsx + app/index.tsx = 7
const SCAFFOLD_FILE_COUNT = 5;

describe('expo compiler — scaffold files', () => {
  it('generates the correct total number of files', () => {
    const files = compile(searchUI);
    expect(Object.keys(files)).toHaveLength(SCAFFOLD_FILE_COUNT + 2);
  });

  it('generates package.json with expo dependencies', () => {
    const files = compile(searchUI);
    expect(files['package.json']).toBeDefined();
    const pkg = JSON.parse(files['package.json']);
    expect(pkg.name).toBe('search-engine');
    expect(pkg.main).toBe('expo-router/entry');
    expect(pkg.dependencies['expo']).toBeDefined();
    expect(pkg.dependencies['expo-router']).toBeDefined();
    expect(pkg.dependencies['react-native']).toBeDefined();
  });

  it('generates tsconfig.json extending expo/tsconfig.base', () => {
    const files = compile(searchUI);
    expect(files['tsconfig.json']).toBeDefined();
    const ts = JSON.parse(files['tsconfig.json']);
    expect(ts.extends).toBe('expo/tsconfig.base');
    expect(ts.compilerOptions.strict).toBe(true);
  });

  it('generates app.json with expo config', () => {
    const files = compile(searchUI);
    expect(files['app.json']).toBeDefined();
    const app = JSON.parse(files['app.json']);
    expect(app.expo.name).toBe('Search Engine');
    expect(app.expo.slug).toBe('search-engine');
    expect(app.expo.platforms).toContain('web');
  });

  it('generates app/_layout.tsx with a Stack navigator', () => {
    const files = compile(searchUI);
    expect(files['app/_layout.tsx']).toBeDefined();
    expect(files['app/_layout.tsx']).toContain('Stack');
    expect(files['app/_layout.tsx']).toContain('RootLayout');
  });

  it('generates app/index.tsx that redirects to the first view', () => {
    const files = compile(searchUI);
    expect(files['app/index.tsx']).toBeDefined();
    expect(files['app/index.tsx']).toContain('Redirect');
    expect(files['app/index.tsx']).toContain('/home');
  });

  it('derives package name and slug from the UI name', () => {
    const files = compile(wikiUI);
    const pkg = JSON.parse(files['package.json']);
    const app = JSON.parse(files['app.json']);
    expect(pkg.name).toBe('wiki');
    expect(app.expo.slug).toBe('wiki');
  });
});

describe('expo compiler — screen file output', () => {
  it('generates one screen file per view', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toBeDefined();
    expect(files['app/results.tsx']).toBeDefined();
  });

  it('uses app/<sanitized-name>.tsx naming', () => {
    const files = compile(wikiUI);
    expect(files['app/wiki_page_view.tsx']).toBeDefined();
    expect(files['app/wiki_page_edit.tsx']).toBeDefined();
  });
});

describe('expo compiler — imports', () => {
  it('always imports View and StyleSheet from react-native', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain("from 'react-native'");
    expect(files['app/home.tsx']).toContain('StyleSheet');
    expect(files['app/home.tsx']).toContain('View');
  });

  it('imports TextInput when view has an input component', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('TextInput');
  });

  it('imports Pressable and Text when view has a button component', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('Pressable');
    expect(files['app/home.tsx']).toContain('Text');
  });

  it('imports FlatList when view has a list component', () => {
    const files = compile(searchUI);
    expect(files['app/results.tsx']).toContain('FlatList');
  });

  it('imports useRouter only when view has outgoing triggered paths', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain("from 'expo-router'");
    expect(files['app/home.tsx']).toContain('useRouter');
  });

  it('does not import useRouter for views with no triggered outgoing paths', () => {
    const files = compile(searchUI);
    expect(files['app/results.tsx']).not.toContain('useRouter');
  });

  it('imports useState only when a component is a controlled input', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('useState');
  });

  it('does not import useState for views with no controlled inputs', () => {
    const files = compile(searchUI);
    expect(files['app/results.tsx']).not.toContain('useState');
  });
});

describe('expo compiler — component rendering', () => {
  it('renders input as TextInput', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('<TextInput');
  });

  it('renders button as Pressable with Text child', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('<Pressable');
    expect(files['app/home.tsx']).toContain('search_button');
  });

  it('renders list as FlatList', () => {
    const files = compile(searchUI);
    expect(files['app/results.tsx']).toContain('<FlatList');
  });

  it('renders richtext as Text', () => {
    const files = compile(wikiUI);
    expect(files['app/wiki_page_view.tsx']).toContain('<Text');
    expect(files['app/wiki_page_view.tsx']).toContain('page_content');
  });

  it('renders form as View with comment', () => {
    const files = compile(wikiUI);
    expect(files['app/wiki_page_edit.tsx']).toContain('content_form');
    expect(files['app/wiki_page_edit.tsx']).toContain('form fields');
  });

  it('renders menu as View with comment', () => {
    const files = compile(wikiUI);
    expect(files['app/wiki_page_view.tsx']).toContain('edit_menu');
    expect(files['app/wiki_page_view.tsx']).toContain('menu items');
  });

  it('sets testID on all components', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('testID="search_bar"');
    expect(files['app/home.tsx']).toContain('testID="search_button"');
    expect(files['app/results.tsx']).toContain('testID="results_list"');
  });
});

describe('expo compiler — controlled inputs', () => {
  it('controlled input has value and onChangeText wired to state', () => {
    const home = compile(searchUI)['app/home.tsx'];
    expect(home).toContain('value={values.search_bar');
    expect(home).toContain('onChangeText');
    expect(home).toContain('setValues');
  });
});

describe('expo compiler — triggers and navigation', () => {
  it('submit trigger generates onSubmitEditing on TextInput', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('onSubmitEditing');
  });

  it('click trigger generates onPress on Pressable', () => {
    const files = compile(wikiUI);
    expect(files['app/wiki_page_view.tsx']).toContain('onPress');
    expect(files['app/wiki_page_edit.tsx']).toContain('onPress');
  });

  it('navigation uses router.push', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('router.push');
  });

  it('navigation includes params when path has params', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('params:');
    expect(files['app/home.tsx']).toContain('query:');
  });

  it('navigation without params uses simple string push', () => {
    const edit = compile(wikiUI)['app/wiki_page_edit.tsx'];
    expect(edit).toContain("router.push('/wiki_page_view')");
  });
});

describe('expo compiler — annotations and ACL', () => {
  it('view annotation is rendered as a comment', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('Landing page with search input');
  });

  it('component annotation is rendered as a comment', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('Search query input');
  });

  it('view ACL is rendered as a comment', () => {
    const files = compile(wikiUI);
    expect(files['app/wiki_page_edit.tsx']).toContain('ACL: roles=[admin]');
  });

  it('component ACL is rendered as a comment', () => {
    const files = compile(wikiUI);
    expect(files['app/wiki_page_view.tsx']).toContain('ACL: roles=[admin]');
  });
});

describe('expo compiler — StyleSheet', () => {
  it('generates a StyleSheet in every screen file', () => {
    const files = compile(searchUI);
    expect(files['app/home.tsx']).toContain('StyleSheet.create');
    expect(files['app/results.tsx']).toContain('StyleSheet.create');
  });

  it('always includes a container style', () => {
    expect(compile(searchUI)['app/home.tsx']).toContain('container:');
  });

  it('includes input style when view has an input component', () => {
    expect(compile(searchUI)['app/home.tsx']).toContain('input:');
  });

  it('includes button styles when view has a button component', () => {
    const home = compile(searchUI)['app/home.tsx'];
    expect(home).toContain('button:');
    expect(home).toContain('buttonText:');
  });

  it('includes theme.ts TODO comment', () => {
    expect(compile(searchUI)['app/home.tsx']).toContain('theme.ts');
  });
});
