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

function buildRouterPush(path: Path): string {
  const dest = '/' + sanitize(path.to);
  const params = path.params ?? [];
  if (params.length === 0) {
    return `router.push('${dest}')`;
  }
  const paramObj = params.map(p => `${p.name}: values.${p.from}`).join(', ');
  return `router.push({ pathname: '${dest}', params: { ${paramObj} } })`;
}

function getOutgoingTrigger(component: Component, outgoing: Path[]): Path | undefined {
  return outgoing.find(p => p.trigger?.component === component.name);
}

function compileInput(
  component: Component,
  isControlled: boolean,
  triggeredPath: Path | undefined,
  indent: string
): string {
  const lines: string[] = [];
  lines.push(`${indent}<TextInput`);
  lines.push(`${indent}  testID="${component.name}"`);
  lines.push(`${indent}  placeholder="${component.name}"`);

  if (isControlled) {
    lines.push(`${indent}  value={values.${component.name} ?? ''}`);
    if (triggeredPath?.trigger?.on === 'change') {
      // Merge state update and navigation into a single onChangeText handler
      lines.push(`${indent}  onChangeText={text => { setValues(v => ({ ...v, ${component.name}: text })); ${buildRouterPush(triggeredPath)}; }}`);
    } else {
      lines.push(`${indent}  onChangeText={text => setValues(v => ({ ...v, ${component.name}: text }))}`);
      if (triggeredPath?.trigger?.on === 'submit') {
        lines.push(`${indent}  onSubmitEditing={() => { ${buildRouterPush(triggeredPath)}; }}`);
      }
    }
  } else {
    if (triggeredPath?.trigger?.on === 'submit') {
      lines.push(`${indent}  onSubmitEditing={() => { ${buildRouterPush(triggeredPath)}; }}`);
    }
  }

  lines.push(`${indent}  style={styles.input}`);
  lines.push(`${indent}/>`);
  return lines.join('\n');
}

function compileButton(component: Component, triggeredPath: Path | undefined, indent: string): string {
  const onPress = triggeredPath ? `() => { ${buildRouterPush(triggeredPath)}; }` : '() => {}';
  return [
    `${indent}<Pressable testID="${component.name}" onPress={${onPress}} style={styles.button}>`,
    `${indent}  <Text style={styles.buttonText}>${component.name}</Text>`,
    `${indent}</Pressable>`,
  ].join('\n');
}

function compileComponent(
  component: Component,
  outgoing: Path[],
  paramSources: Set<string>,
  indent: string
): string {
  const lines: string[] = [];

  if (component.annotation) {
    lines.push(`${indent}{/* ${component.annotation.note} */}`);
  }
  if (component.acl?.roles) {
    lines.push(`${indent}{/* ACL: roles=[${component.acl.roles.join(', ')}] */}`);
  }

  const triggeredPath = getOutgoingTrigger(component, outgoing);
  const isControlled = component.type === 'input' && paramSources.has(component.name);

  switch (component.type) {
    case 'input':
      lines.push(compileInput(component, isControlled, triggeredPath, indent));
      break;
    case 'button':
      lines.push(compileButton(component, triggeredPath, indent));
      break;
    case 'list':
      lines.push(
        `${indent}<FlatList testID="${component.name}" data={[]} keyExtractor={(_item, i) => String(i)} renderItem={() => <Text>(placeholder)</Text>} style={styles.list} />`
      );
      break;
    case 'richtext':
      lines.push(`${indent}<Text testID="${component.name}" style={styles.richtext}>(content)</Text>`);
      break;
    case 'form': {
      const tag = triggeredPath?.trigger?.on === 'click' ? 'Pressable' : 'View';
      const pressHandler = triggeredPath?.trigger?.on === 'click' ? ` onPress={() => { ${buildRouterPush(triggeredPath)}; }}` : '';
      lines.push(`${indent}<${tag} testID="${component.name}"${pressHandler} style={styles.form}>`);
      lines.push(`${indent}  {/* form fields */}`);
      lines.push(`${indent}</${tag}>`);
      break;
    }
    case 'menu': {
      const tag = triggeredPath?.trigger?.on === 'click' ? 'Pressable' : 'View';
      const pressHandler = triggeredPath?.trigger?.on === 'click' ? ` onPress={() => { ${buildRouterPush(triggeredPath)}; }}` : '';
      lines.push(`${indent}<${tag} testID="${component.name}"${pressHandler} style={styles.menu}>`);
      lines.push(`${indent}  {/* menu items */}`);
      lines.push(`${indent}</${tag}>`);
      break;
    }
    default: {
      const tag = triggeredPath?.trigger?.on === 'click' ? 'Pressable' : 'View';
      const pressHandler = triggeredPath?.trigger?.on === 'click' ? ` onPress={() => { ${buildRouterPush(triggeredPath)}; }}` : '';
      lines.push(`${indent}<${tag} testID="${component.name}"${pressHandler} style={styles.placeholder} />`);
      break;
    }
  }

  return lines.join('\n');
}

function compileScreen(view: View, outgoing: Path[]): string {
  const screenName = toPascalCase(view.name) + 'Screen';
  const paramSources = new Set(outgoing.flatMap(path => path.params?.map(param => param.from) ?? []));
  const needsRouter = outgoing.some(p => p.trigger);
  const needsState = (view.components ?? []).some(c => c.type === 'input' && paramSources.has(c.name));

  const rnImports = new Set<string>(['View', 'StyleSheet']);
  for (const c of view.components ?? []) {
    if (c.type === 'input') rnImports.add('TextInput');
    if (c.type === 'button') { rnImports.add('Pressable'); rnImports.add('Text'); }
    if (c.type === 'list') { rnImports.add('FlatList'); rnImports.add('Text'); }
    if (c.type === 'richtext') rnImports.add('Text');
    // Non-button components with a click trigger are rendered as Pressable
    const trigger = outgoing.find(p => p.trigger?.component === c.name);
    if (trigger?.trigger?.on === 'click' && c.type !== 'button') rnImports.add('Pressable');
  }

  const lines: string[] = [];

  if (needsState) lines.push(`import { useState } from 'react';`);
  lines.push(`import { ${[...rnImports].sort().join(', ')} } from 'react-native';`);
  if (needsRouter) lines.push(`import { useRouter } from 'expo-router';`);
  lines.push('');

  if (view.acl?.roles) lines.push(`// ACL: roles=[${view.acl.roles.join(', ')}]`);
  if (view.annotation) lines.push(`// ${view.annotation.note}`);

  lines.push(`export default function ${screenName}() {`);
  if (needsRouter) lines.push(`  const router = useRouter();`);
  if (needsState) lines.push(`  const [values, setValues] = useState<Record<string, string>>({});`);
  lines.push('');
  lines.push('  return (');
  lines.push(`    <View testID="${sanitize(view.name)}" style={styles.container}>`);

  for (const component of view.components ?? []) {
    lines.push(compileComponent(component, outgoing, paramSources, '      '));
  }

  lines.push('    </View>');
  lines.push('  );');
  lines.push('}');
  lines.push('');

  const styleKeys = new Set<string>(['container']);
  for (const c of view.components ?? []) {
    if (c.type === 'input') styleKeys.add('input');
    if (c.type === 'button') { styleKeys.add('button'); styleKeys.add('buttonText'); }
    if (c.type === 'list') styleKeys.add('list');
    if (c.type === 'richtext') styleKeys.add('richtext');
    if (c.type === 'form') styleKeys.add('form');
    if (c.type === 'menu') styleKeys.add('menu');
    if (!['input', 'button', 'list', 'richtext', 'form', 'menu'].includes(c.type)) {
      styleKeys.add('placeholder');
    }
  }

  lines.push('// TODO: replace hardcoded values with colours/spacing/typography from src/theme.ts');
  lines.push('const styles = StyleSheet.create({');
  lines.push('  container: { flex: 1, padding: 16 },');
  if (styleKeys.has('input')) lines.push("  input: { borderWidth: 1, borderColor: '#e0e0e0', padding: 8, borderRadius: 4, marginBottom: 8 },");
  if (styleKeys.has('button')) lines.push("  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 4, alignItems: 'center', marginBottom: 8 },");
  if (styleKeys.has('buttonText')) lines.push("  buttonText: { color: '#ffffff', fontWeight: '700' },");
  if (styleKeys.has('list')) lines.push('  list: { flex: 1 },');
  if (styleKeys.has('richtext')) lines.push('  richtext: { fontSize: 16, lineHeight: 24 },');
  if (styleKeys.has('form')) lines.push('  form: { gap: 8 },');
  if (styleKeys.has('menu')) lines.push("  menu: { flexDirection: 'row', gap: 8 },");
  if (styleKeys.has('placeholder')) lines.push("  placeholder: { height: 48, backgroundColor: '#f5f5f5' },");
  lines.push('});');

  return lines.join('\n');
}

function compilePackageJson(ui: UI): string {
  const name = sanitize(ui.name).toLowerCase().replace(/_/g, '-');
  return JSON.stringify({
    name,
    main: 'expo-router/entry',
    version: '1.0.0',
    scripts: {
      start: 'expo start',
      android: 'expo start --android',
      ios: 'expo start --ios',
      web: 'expo start --web',
    },
    dependencies: {
      '@react-navigation/native': '^7.1.33',
      expo: '~55.0.5',
      'expo-router': '~55.0.4',
      'expo-status-bar': '~55.0.4',
      react: '19.2.4',
      'react-dom': '19.2.4',
      'react-native': '0.83.2',
      'react-native-safe-area-context': '~5.6.2',
      'react-native-screens': '~4.23.0',
      'react-native-web': '~0.21.2',
    },
    devDependencies: {
      '@types/react': '~19.2.14',
      typescript: '~5.9.3',
    },
  }, null, 2) + '\n';
}

function compileTsConfig(): string {
  return JSON.stringify({
    extends: 'expo/tsconfig.base',
    compilerOptions: { strict: true },
    include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'],
  }, null, 2) + '\n';
}

function compileAppJson(ui: UI): string {
  const slug = sanitize(ui.name).toLowerCase().replace(/_/g, '-');
  return JSON.stringify({
    expo: {
      name: ui.name,
      slug,
      version: '1.0.0',
      platforms: ['ios', 'android', 'web'],
      scheme: slug,
    },
  }, null, 2) + '\n';
}

function compileLayout(): string {
  return `import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
`;
}

function compileIndex(firstView: View): string {
  const dest = '/' + sanitize(firstView.name);
  return `import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="${dest}" />;
}
`;
}

export function compile(ui: UI): Record<string, string> {
  const files: Record<string, string> = {};
  const paths = ui.paths ?? [];
  const views = ui.views ?? [];

  files['package.json'] = compilePackageJson(ui);
  files['tsconfig.json'] = compileTsConfig();
  files['app.json'] = compileAppJson(ui);
  files['app/_layout.tsx'] = compileLayout();
  if (views.length > 0) {
    files['app/index.tsx'] = compileIndex(views[0]);
  }

  for (const view of views) {
    const outgoing = paths.filter(p => p.from === view.name);
    files[`app/${sanitize(view.name)}.tsx`] = compileScreen(view, outgoing);
  }

  return files;
}
