## Why

Alfred, running on Hermes Agent, needs to read and modify Actual Budget data through a standardized, secure, and agent-independent integration. V1 creates this bridge as a reusable MCP server, using only Actual's public APIs and keeping the operational scope simple for deployment on a ZimaOS NAS.

## What Changes

- Create a Node.js and TypeScript MCP server transported over stdio and compatible with any MCP client.
- Integrate the server with Actual Budget exclusively through `@actual-app/api`, with environment-based configuration, a persistent local cache, lazy initialization, controlled synchronization, and graceful shutdown.
- Expose MCP tools for health, accounts, categories, payees, transaction reads, idempotent imports, updates, protected deletion, and synchronization.
- Validate every input with Zod, normalize results and errors, keep stdout reserved for the MCP protocol, and send sanitized logs only to stderr.
- Expose all MCP-authored tool metadata, response labels, status messages, validation messages, and errors in English while preserving user-authored Actual data verbatim.
- Protect destructive operations, secrets, and budget consistency through allowlists, explicit deletion confirmation, and serialized operations.
- Provide predictable installation and updates from GitHub, Hermes documentation, an optional Docker image, automated tests, and CI.
- Limit V1 to operational Actual access; Pluggy integration, cron, LLM categorization, financial intelligence, rules, schedules, budgeting, investments, and reports remain out of scope.

## Capabilities

### New Capabilities

- `actual-runtime`: Configuration, lifecycle, connection, budget loading, local cache, synchronization, health, and serialized access to `@actual-app/api`.
- `actual-read-tools`: Read-only MCP tools for Actual accounts, balances, categories, payees, and transactions.
- `actual-transaction-management`: Idempotent transaction import, allowlisted updates, and explicitly confirmed deletion.
- `mcp-stdio-runtime`: MCP stdio server, Zod contracts, structured results, English-language server-authored content, annotations, error handling, and stdout/stderr discipline.
- `distribution-and-operations`: Installation, updates, execution, Hermes integration, optional Docker image, documentation, tests, and CI.

### Modified Capabilities

None. The project does not yet have existing functional specifications.

## Impact

- A new Node.js and TypeScript package initially versioned as `0.1.0`.
- Runtime dependencies on `@actual-app/api`, `@modelcontextprotocol/server` v2, and Zod 4.
- Development dependencies for compilation and testing, including TypeScript, TSX, Vitest, and the MCP client.
- A new persistent cache in the Hermes environment, separate from the Actual container's data volume.
- Network integration from the Hermes container to the Actual Server published on the NAS, initially at `http://192.168.3.99:15006`.
- A new distribution flow in the `jeffhen0811-sys/actual-budget-mcp` repository, supporting Node.js 22 or newer.
