---
tags: [agent, multi-agent, mcp, 04-agent]
created: 2026-06-27
---
# Multi-Agent: Supervisor-Worker Deep Dive
**Day 9** · MCP, A2A, LangGraph

## Supervisor Role
- Parse initial request
- Decide which workers to invoke
- Track state, handle retries
- Synthesize final output
- Know when to request human review

## Worker Design (3 Qualities)
1. **Focused**: one capability (retrieve, tool, synthesize)
2. **Stateless**: given input → produce output, no session baggage
3. **Testable**: clear input/output contract

## MCP (Model Context Protocol)
Standard protocol for agent ↔ external tool connection.
- Agent discovers tools via `tools/list`
- Each tool has name + description + inputSchema
- Invoke via `tools/call` JSON-RPC
- *Analogy*: MCP = USB for AI agents — one standard, any device

## A2A (Agent-to-Agent)
- MCP = agent talks to tool
- A2A = agent talks to another agent
- Message contract: Task + Context + Expected Output
- Example: `task="retrieve evidence"`, `context="{query, constraints}"`, `expected_output="top-3 chunks"`

## LangGraph Orchestration
- **Nodes** = agents/functions
- **Edges** = routing logic (conditional)
- **State** = shared TypedDict across steps
- Human-in-the-loop: interrupt graph at any node for approval

## State Schema (minimum)
```python
{
  task: str,
  plan: list[workers],
  worker_results: dict,
  status: pending|running|done|error,
  final_answer: str,
  trace: list[timestamped_events]
}
```
