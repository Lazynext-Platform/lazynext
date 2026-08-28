# ADR-010: MCP-Style Creative Tool Contracts

## Status
Accepted

## Date
2026-08-28

## Context
LazyNext's creative operations — generate, refine, remix, analyze — are currently implemented as
ordinary functions scattered across `src/lib/creative/`. Each has its own ad-hoc input and output
shapes, its own validation, and no machine-readable description of what it accepts or returns. This
works when a human developer wires each function to a UI button, but it does not scale to agent-
driven workflows where an autonomous agent must discover available operations, understand their
inputs, validate calls, and compose them into multi-step pipelines.

OpenChatCut (#48) introduces an MCP (Model Context Protocol) concept for exposing editing
operations as self-describing tools. LazyNext adapts this idea to its own creative pipeline
architecture: rather than adopting an external protocol, we define a lightweight `CreativeTool`
contract that standardizes how creative operations describe themselves and are invoked.

## Decision
Create `src/lib/creative/tools.ts` defining a `CreativeTool` interface and a registry of 10
existing creative functions exposed as tools.

### CreativeTool Interface
Each tool is defined by:
- **name** — unique identifier for the tool
- **description** — human-readable summary of what the tool does
- **inputSchema** — inline JSON Schema describing the expected input
- **outputSchema** — inline JSON Schema describing the returned output
- **cost** — credit cost of invoking the tool
- **capabilities** — tags describing the tool's capabilities (e.g., `generation`, `analysis`,
  `refinement`)
- **execute** — the function that performs the operation

### Registered Tools
10 existing creative functions are registered as tools, each with inline JSON schemas for input
and output validation. The registry makes them discoverable by name and iterable as a collection.

### Helper Functions
- `validateAgainstSchema()` — validates a payload against a JSON Schema, returning errors for
  missing or malformed fields
- `executeTool()` — looks up a tool by name, validates its input, and invokes its execute function
- `registerTool()` / `getTool()` / `listTools()` — registry functions for registering, looking up,
  and enumerating available tools

## Consequences
- **Positive**: Creative operations are now self-describing — each tool carries its own JSON
  schemas, making inputs and outputs machine-readable and discoverable
- **Positive**: Future agents can enumerate available tools, inspect their schemas, and call them
  programmatically without hard-coded knowledge of each function
- **Positive**: Input validation is standardized through `validateAgainstSchema()`, replacing the
  ad-hoc validation previously scattered across individual functions
- **Negative**: Tool definitions duplicate cost metadata already maintained in `CREATIVE_COSTS` —
  the cost must be kept in sync in two places
- **Neutral**: The `execute` functions are not wired to the actual creative pipeline yet — the
  tools are contract-only at this stage. A future iteration will connect each tool's execute
  function to its underlying implementation

## Inspired By
- OpenChatCut (#48) — MCP concept for self-describing creative operations

## Implementation Notes
- `src/lib/creative/tools.ts` — `CreativeTool` interface, registry, `validateAgainstSchema()`,
  `executeTool()`, and 10 registered tools
- Inline JSON schemas for each tool's input and output
- Integrates with existing creative functions in `src/lib/creative/`
