# Tacky

A YAML schema language for describing user interfaces and the paths users take through them — compiled to working prototypes and diagrams.

It occupies the same space relative to a UI as DBML does to a database schema, or OpenAPI does to a REST API: a concise, human-readable spec that can be handed to a compiler or a model to generate real output. The name reflects its purpose: a lo-fi scaffold that sticks a spec to generated output.

## What it does

You write a spec in YAML describing your UI's views, components, actors, navigation paths, and fixture data. The compiler reads it and generates:

- **React** — a full Vite + TypeScript + React project, ready to run with `pnpm install && pnpm dev`
- **Expo** — React Native screen files using Expo Router, dropped into `src/generated/` of an existing Expo project
- **Mermaid** — a flowchart diagram of views and navigation paths

## Schema at a glance

```yaml
name: Search Engine

actors:
  - name: user

views:
  - name: home
    components:
      - name: search_bar
        type: input
      - name: search_button
        type: button

  - name: results
    components:
      - name: results_list
        type: list

paths:
  - from: home
    to: results
    trigger:
      component: search_button
      on: click
    params:
      - name: query
        from: search_bar
```

Key concepts:

- **Views** are screens. Each compiles to a component file and a route.
- **Paths** are navigation edges. A `trigger` wires a component interaction (`click`, `submit`, `change`) to the navigation. `params` carry component values to the destination.
- **Actors** are named user roles (e.g. `gm`, `player`). They can be attached to paths and views to document access intent.
- **ACL** can be attached to any element. It surfaces as comments in generated output.
- **Annotations** document intent inline — they render as code comments in all targets.

See [SPEC.md](./SPEC.md) for the full schema reference and compiler rules.

## Usage

```
bun run src/compiler/index.ts <input.yaml> <target> [output]
```

### React

Generates a complete Vite + TypeScript + React Router project. Output defaults to `build/`.

```
bun run src/compiler/index.ts examples/search-engine.yaml react
cd build && pnpm install && pnpm dev
```

### Expo

Generates a complete, runnable Expo + React Native project. Output defaults to `build/` inside the current directory.

```
bun run src/compiler/index.ts examples/search-engine.yaml expo
cd build && pnpm install && pnpm web
```

The generated project includes `package.json`, `tsconfig.json`, `app.json`, a root `app/_layout.tsx` (Stack navigator), an `app/index.tsx` redirect to the first view, and one `app/<view-name>.tsx` per view. Each screen uses RN primitives (`TextInput`, `Pressable`, `FlatList`, etc.), `useRouter` from `expo-router` for navigation, and a `StyleSheet.create` block at the bottom.

### Mermaid

Prints a flowchart to stdout, or writes to a file.

```
# Print to stdout
bun run src/compiler/index.ts examples/search-engine.yaml mermaid

# Write to file
bun run src/compiler/index.ts examples/search-engine.yaml mermaid diagram.md
```

## Examples

- [`examples/search-engine.yaml`](./examples/search-engine.yaml) — a search UI with navigation and query params
- [`examples/wiki.yaml`](./examples/wiki.yaml) — a wiki with GM/admin ACL and an edit flow
