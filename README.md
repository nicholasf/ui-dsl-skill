# Tacky

A YAML schema language for describing user interfaces and the paths users take through them — compiled to working prototypes and diagrams.

It occupies the same space relative to a UI as DBML does to a database schema, or OpenAPI does to a REST API: a concise, human-readable spec that can be handed to a compiler or a model to generate real output. The name reflects its purpose: a lo-fi scaffold that sticks a spec to generated output.

## What it does

You write a spec in YAML describing your UI's views, components, actors, navigation paths, and fixture data. The compiler reads it and generates:

- **React** — a full Vite + TypeScript + React project, ready to run with `pnpm install && pnpm dev`
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
        fixtures:
          - ref: fish_results
            when:
              param: query
              equals: fish

paths:
  - from: home
    to: results
    trigger:
      component: search_button
      on: click
    params:
      - name: query
        from: search_bar

fixtures:
  - name: fish_results
    data:
      - title: "Salmon Fishing Guide"
        url: "https://example.com/salmon"
        snippet: "Everything you need to know about salmon fishing"
```

Key concepts:

- **Views** are screens. Each compiles to a React component and a route.
- **Paths** are navigation edges. A `trigger` wires a component interaction (click, submit, change) to the navigation. `params` carry component values as URL query params.
- **Fixtures** are named dummy datasets. A component references them with a `when` condition that matches against URL query params — so searching "fish" shows fish results, "climate" shows climate results.
- **Annotations** and **ACL** can be attached to any element. Annotations render as code comments; ACL is surfaced as a comment in the current targets.

See [SPEC.md](./SPEC.md) for the full schema reference and compiler rules.

## Usage

```
bun run src/compiler/index.ts <input.yaml> <target> [output-dir]
```

```
# Generate a React app
bun run src/compiler/index.ts examples/search-engine.yaml react search-engine-app
cd search-engine-app && pnpm install && pnpm dev

# Generate a Mermaid diagram
bun run src/compiler/index.ts examples/search-engine.yaml mermaid diagram.md
```

## Examples

- [`examples/search-engine.yaml`](./examples/search-engine.yaml) — a search UI with navigation and fixture data
- [`examples/wiki.yaml`](./examples/wiki.yaml) — a wiki with admin ACL and edit flow
