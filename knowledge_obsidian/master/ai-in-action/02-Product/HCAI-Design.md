---
tags: [product, ux, 02-product]
created: 2026-06-27
---
# Human-Centered AI Design
**Day 18 · Track 1** · Design AI products people trust

## Core Question
*"Don't let your UI write a check that your AI can't cash."* — Eytan Adar

## Trust Calibration
| Concept | Implementation |
|---------|---------------|
| **Expectation** | Tell user what AI can/can't do, how well, when it fails |
| **Explainability** | Show *why* AI gave this answer, when to doubt |
| **Control** | Allow edit, reject, undo, preview before commit |

## Augmentation vs Automation Spectrum
| Level | Cost of Error | Example |
|-------|---------------|---------|
| Inaction | Very high (medical) | AI suggests, doctor decides |
| Ask | High (legal/finance) | AI drafts, user approves |
| Act | Low (routine) | AI executes, undo available |

## Warmth + Competence Matrix
- **Warmth** = friendly, approachable tone → longer user engagement
- **Competence** = skilled, confident → must be calibrated (not overstated)
- Users forgive more when initial expectations are set correctly

## Design for Failure
- **Error paths**: detect → route → recover → learn
- **Graceful degradation**: when AI unsure → ask questions, not guess
- **Undo/Rollback**: every action should be reversible

## References
- Google PAIR Guidebook · Microsoft HAX Toolkit
- Don't Make Me Think · Design of Everyday Things
- `[[Retention-Habit-Loop]]`
