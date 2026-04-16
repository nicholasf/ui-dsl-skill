# Tacky — Specification

This document defines the schema language, the rules governing how schema elements relate to each other, and the rules each compiler target must follow. It is the authoritative reference for recreating or extending this codebase.

---

## Purpose

Tacky is a YAML DSL for modelling user interfaces and the paths users take through them — analogous to how DBML relates to SQL, or OpenAPI relates to a REST API. A UI spec is target-agnostic: the same YAML file can be compiled to a Mermaid diagram, a React scaffold, or any future target.

---

## Schema elements

### `UI` (root)

The top-level document. Every other element is nested within it.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Human-readable name for the UI (e.g. `Search Engine`) |
| `actors` | Actor[] | no | People or systems that interact with the UI |
| `resources` | Resource[] | no | Data entities the UI reads from or writes to |
| `views` | View[] | no | Screens or pages in the UI |
| `paths` | Path[] | no | Navigation edges between views |
| `acl` | ACL | no | Top-level access control applied across the whole UI |

---

### `Actor`

A person or external system that interacts with the UI. Actors are referenced by name in `Path.actors` and `ACL` conditions.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Unique identifier (e.g. `user`, `admin`) |
| `annotation` | Annotation | no | Human note about this actor's role |

---

### `Resource`

A data entity the UI surfaces or manipulates. Resources give context to views and components but are not directly compiled to code — they document intent.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Unique identifier (e.g. `search_results`) |
| `purpose` | string | no | Plain-English description of what this resource represents |
| `annotation` | Annotation | no | Additional notes |

---

### `View`

A screen or page. Each view compiles to its own component file. A view contains zero or more components.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Unique identifier, used as the URL path segment (e.g. `home` → `/home`) |
| `components` | Component[] | no | UI elements that appear in this view |
| `annotation` | Annotation | no | Human note about the view's purpose |
| `acl` | ACL | no | Access control for the whole view |

**Rules:**
- View names are sanitised (spaces → underscores) before use as URL path segments.
- View names are converted to PascalCase for the React component name (e.g. `wiki_page_edit` → `WikiPageEdit`).
- The first view in the `views` list is the default: a redirect from `/` to that view's path is generated.

---

### `Component`

A UI element within a view. Each component compiles to an HTML element whose type is determined by `type`.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Unique within the view (e.g. `search_bar`) |
| `type` | string | yes | Element kind — see type map below |
| `annotation` | Annotation | no | Human note, rendered as a code comment |
| `acl` | ACL | no | Access control for this component |

**Component type map (React target):**

| `type` | HTML element | Notes |
|---|---|---|
| `input` | `<input>` | Becomes a controlled component when its name appears in a path's `params.from` |
| `button` | `<button>` | Label is the component name |
| `list` | `<ul><li>` | Single placeholder item |
| `embed` | `<iframe>` | |
| anything else | `<div data-type="...">` | Generic fallback |

---

### `Path`

A directed navigation edge from one view to another. Paths are the sole location for navigation logic — component definitions do not reference destinations.

| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string | yes | Name of the source view |
| `to` | string | yes | Name of the destination view |
| `actors` | string[] | no | Names of actors permitted to follow this path |
| `trigger` | Trigger | no | Which component interaction fires this navigation |
| `params` | Param[] | no | Component values to carry to the destination as URL query params |
| `annotation` | Annotation | no | Human note about why this path exists |
| `acl` | ACL | no | Access control for this path |

**Rules:**
- `trigger.component` must match the `name` of a component in the `from` view.
- `params[].from` must match the `name` of a component in the `from` view.
- A path without a `trigger` is a valid navigation edge for diagram targets but produces no interactive wiring in the React target.
- Multiple paths can share the same `from` view; each is wired independently.

---

### `Trigger`

Declares which component interaction fires a path's navigation.

| Field | Type | Required | Description |
|---|---|---|---|
| `component` | string | yes | Name of the component that fires the navigation |
| `on` | `submit` \| `click` \| `change` | yes | The interaction event |

**Event → React handler map:**

| `on` | React handler | Condition |
|---|---|---|
| `submit` | `onKeyDown` | fires when `e.key === 'Enter'` |
| `click` | `onClick` | fires unconditionally |
| `change` | `onChange` | fires on every change |

---

### `Param`

A value carried from the source view to the destination view as a URL query parameter.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | The query param key (e.g. `query` → `?query=...`) |
| `from` | string | yes | Name of the component whose current value is used |

**Rules:**
- When a component is referenced in `params.from`, it is compiled as a controlled React input (with `useState`, `value`, and `onChange`).
- The value is URL-encoded before being appended to the navigation target.
- Components not referenced in any `params.from` are compiled as uncontrolled inputs.

---

### `Annotation`

A human-readable note attached to any schema element. Annotations are never semantic — they do not affect compilation logic — but they are always surfaced in compiler output as code comments.

| Field | Type | Required |
|---|---|---|
| `note` | string | yes |

---

### `ACL`

Access control metadata. In the React target, ACL is rendered as a JSX comment. Future targets may enforce it structurally.

| Field | Type | Description |
|---|---|---|
| `roles` | string[] | Role names that may access this element |
| `conditions` | string[] | Freeform condition strings (informational) |
| `annotation` | Annotation | Human note about this access rule |

---

## Compiler rules (all targets)

1. Names are always sanitised before use: spaces replaced with underscores.
2. Annotations are always preserved in output as comments, never omitted.
3. ACL is always preserved in output as comments in the current targets.
4. Resources are informational only — no target compiles them to executable output.
5. A `Path` without a `trigger` is valid; it contributes to diagrams but not to interactive wiring.

---

## Compiler rules (React target)

1. Each view compiles to `src/views/<PascalCaseName>.tsx`.
2. `App.tsx` contains the router. It imports every view and defines one `<Route>` per view.
3. A `<Navigate>` redirect from `/` to the first view's path is always emitted.
4. `useNavigate` is imported into a view only when that view has at least one outgoing path with a trigger.
5. `useState` is imported into a view only when at least one of its components is referenced in an outgoing `params.from`.
6. Controlled input wiring (`value`, `onChange` updating state) is applied only to components referenced in `params.from`.
7. Navigation to a destination appends params as a URL query string, values URL-encoded.
8. The full project scaffold is generated alongside view files: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`.
9. The generated project uses pnpm. After generation, run `pnpm install && pnpm dev` to start.

---

## Compiler rules (Expo target)

1. Each view compiles to `app/<sanitized-name>.tsx` (relative to the output directory).
2. A full standalone project scaffold is generated alongside screen files:
   - `package.json` — Expo 55 dependencies, `expo-router/entry` as main
   - `tsconfig.json` — extends `expo/tsconfig.base` with strict mode
   - `app.json` — Expo config with name, slug, platforms, scheme
   - `app/_layout.tsx` — root `Stack` navigator
   - `app/index.tsx` — `Redirect` to the first view's route
3. All screen components use `export default function` (Expo Router convention).
4. `View` and `StyleSheet` are always imported from `react-native`.
5. Additional RN primitives are imported only when the view uses them:
   - `input` → `TextInput`
   - `button` → `Pressable`, `Text`
   - `list` → `FlatList`, `Text`
   - `richtext` → `Text`
   - `form`, `menu`, unknown → `View` (already imported)
6. `useRouter` from `expo-router` is imported only when the view has at least one outgoing triggered path.
7. `useState` is imported only when at least one component is referenced in an outgoing `params.from` (controlled input).
8. Controlled inputs (`params.from`) receive `value` and `onChangeText` wired to component state.
9. Trigger → React Native handler mapping:
   - `submit` → `onSubmitEditing` on `TextInput`
   - `click` → `onPress` on `Pressable`
   - `change` → merged into `onChangeText` on `TextInput` (state update + navigation in one handler)
10. Navigation uses `router.push(path)` for paths without params, or `router.push({ pathname, params })` when params are present.
11. Every rendered element has a `testID` prop set to the component name.
12. A `StyleSheet.create({})` block is always emitted at the bottom of the file. Only style keys actually needed by the view's components are included.
13. The StyleSheet includes a `// TODO: replace hardcoded values with colours/spacing/typography from src/theme.ts` comment.
14. Annotations render as `{/* note */}` JSX comments immediately before the component.
15. ACL renders as `{/* ACL: roles=[...] */}` JSX comments immediately before the component. View-level ACL renders as a `// ACL:` line comment before the function declaration.

---

## File layout (this repository)

```
src/
  compiler/
    index.ts          # CLI entry point: parse → compile → write
    parser.ts         # Parses YAML input to a UI object
    types.ts          # TypeScript interfaces for all schema elements
    targets/
      react.ts        # React compiler
      mermaid.ts      # Mermaid diagram compiler
    __tests__/
      parser.test.ts
      mermaid.test.ts
      react.test.ts
  schema/
    schema.yaml       # JSON Schema definition of the DSL
examples/
  search-engine.yaml
  wiki.yaml
```

---

## CLI usage

```
bun run src/compiler/index.ts <input.yaml> <target> [output]
```

| Target | Default output | Description |
|---|---|---|
| `mermaid` | stdout | Mermaid flowchart; pass a path to write to a file instead |
| `react` | `build/` | Full React + Vite + TypeScript project |
| `expo` | `build/` | Full Expo + React Native project with Expo Router |
