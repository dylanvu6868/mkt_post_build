---
tags: [agent, architecture, 04-agent]
created: 2026-06-27
---
# Agent Architecture & Decision Framework
**Day 3** · From ReAct to Multi-Agent

## Agent Core = ReAct Loop
```
Thought → Action → Observation → Thought → ... → Final Answer
```
- **Thought**: reasoning about current situation
- **Action**: tool call or internal step
- **Observation**: tool result or data

## Single-Agent Limits
1. **Context bottleneck**: one agent holds too many goals + tools + states
2. **Specialization trade-off**: good at everything = master of none
3. **Limited parallelism**: sequential execution
4. **Reliability**: single point of failure — one wrong step derails everything

## When to Go Multi-Agent
- Task has distinct roles (plan/retrieve/tool/synthesize)
- Independent subtasks can run in parallel
- Need clear debugging boundary (who failed?)
- Context window can't hold all tool outputs

## Multi-Agent Patterns
| Pattern | Best For | Risk |
|---------|----------|------|
| Supervisor-Worker | Routing to specialized agents | Supervisor becomes bottleneck |
| Pipeline | Fixed sequence steps | Inflexible flow changes |
| Debate | Multiple perspectives, high-stakes | Cost and aggregation complexity |
| Hierarchical | Enterprise scale | Complex design/debug |
