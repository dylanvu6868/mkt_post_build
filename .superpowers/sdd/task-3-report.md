# Task 3 Report: Email Marketing Backend Endpoints

## Status: COMPLETE

## TDD Evidence

### RED (before routers wired)
```
11 failed, 4 warnings in 3.89s
FAILED tests/test_email_endpoints.py::test_template_crud - assert 404 == 201
FAILED tests/test_email_endpoints.py::test_template_ownership_isolation - KeyError
FAILED tests/test_email_endpoints.py::test_contact_create_and_list - assert 404 == 201
FAILED tests/test_email_endpoints.py::test_contact_csv_import - assert 404 == 201
FAILED tests/test_email_endpoints.py::test_contact_filter_by_tag - KeyError
FAILED tests/test_email_endpoints.py::test_contact_filter_by_status - KeyError
FAILED tests/test_email_endpoints.py::test_list_crud_with_contacts - KeyError
FAILED tests/test_email_endpoints.py::test_schedule_and_cancel - KeyError
FAILED tests/test_email_endpoints.py::test_schedule_nonexistent_template_404
FAILED tests/test_email_endpoints.py::test_schedule_nonexistent_list_404 - KeyError
FAILED tests/test_email_endpoints.py::test_cancel_non_pending_returns_400 - KeyError
```

### GREEN (after implementation)
```
11 passed, 4 warnings in 3.40s
```

### Full Suite
```
101 passed, 4 warnings in 14.90s
```
(90 prior + 11 new = 101 total, 0 failures)

## Files Created
- `backend/app/mcp/email/templates.py` — CRUD for email templates
- `backend/app/mcp/email/contacts.py` — CRUD + CSV import for contacts
- `backend/app/mcp/email/lists.py` — CRUD + add/remove contacts for lists
- `backend/app/mcp/email/scheduling.py` — schedule, list, cancel, unsubscribe
- `backend/tests/test_email_endpoints.py` — 11 tests covering all endpoints

## Files Modified
- `backend/app/main.py` — added 4 router registrations after existing `mcp_router`

## Route List
| Method | Path | Handler |
|--------|------|---------|
| GET | `/mcp/email/templates` | list_templates |
| GET | `/mcp/email/templates/{template_id}` | get_template |
| POST | `/mcp/email/templates` | create_template (201) |
| PATCH | `/mcp/email/templates/{template_id}` | update_template |
| DELETE | `/mcp/email/templates/{template_id}` | delete_template (204) |
| GET | `/mcp/email/contacts` | list_contacts (filter: tag, status) |
| POST | `/mcp/email/contacts` | create_contact (201) |
| POST | `/mcp/email/contacts/import` | import_contacts CSV (201) |
| PATCH | `/mcp/email/contacts/{contact_id}` | update_contact |
| DELETE | `/mcp/email/contacts/{contact_id}` | delete_contact (204) |
| GET | `/mcp/email/lists` | list_lists (includes contact_count) |
| POST | `/mcp/email/lists` | create_list (201) |
| POST | `/mcp/email/lists/{list_id}/contacts` | add_contacts_to_list |
| DELETE | `/mcp/email/lists/{list_id}/contacts` | remove_contacts_from_list |
| DELETE | `/mcp/email/lists/{list_id}` | delete_list (204) |
| POST | `/mcp/email/schedule` | schedule_email (201) |
| GET | `/mcp/email/scheduled` | list_scheduled |
| POST | `/mcp/email/cancel-schedule` | cancel_schedule |
| POST | `/mcp/email/unsubscribe/{token}` | unsubscribe (no auth) |

## Self-Review Findings

1. **All 4 routers wired in main.py** — yes, no prefix collisions (templates, contacts, lists each have their own prefix; scheduling uses `/mcp/email` with unique sub-paths).
2. **Ownership isolation** — enforced on every get/patch/delete via `if not x or x.user_id != user.id: raise HTTPException(404)`. Tested with `test_template_ownership_isolation`.
3. **log_action** — called in templates (create/update/delete), contacts (create/import), lists (create), scheduling (schedule/cancel) per the brief.
4. **Tests cover**: full CRUD lifecycle, ownership isolation 404, CSV import with count assertion, tag filter, status filter, list contact_count, schedule+cancel, 404 for nonexistent template/list, 400 for double-cancel.
5. **No unused imports** — verified all 4 router files. `EmailContact` in scheduling.py is used by the unsubscribe endpoint.
6. **Full suite green**: 101 passed, 0 failures, 4 pre-existing deprecation warnings only.

## Concerns
- The `unsubscribe/{token}` endpoint uses the contact's email address as the token (no cryptographic token). This works for the current spec but is not production-secure — should be upgraded to a signed/hashed token in a future task.
- The `DELETE /{list_id}/contacts` endpoint accepts a JSON body on DELETE, which some HTTP clients don't support (httpx required `client.request("DELETE", ...)` workaround in tests). This matches the brief spec.

---

## Bug-Fix Addendum: Two Latent 500-Crash Fixes

### Fix 1 — Unsubscribe crash on duplicate emails across users

**File:** `backend/app/mcp/email/scheduling.py:65-67`

**Before:**
```python
)).scalar_one_or_none()
```

**After:**
```python
)).scalars().first()
```

**Root cause:** `email_contacts.email` is not unique — the same email exists across multiple users. `.scalar_one_or_none()` raises `MultipleResultsFound` when >=2 rows match, producing a 500. `.scalars().first()` returns the first match (or None), preserving the 404-when-none behavior.

### Fix 2 — Duplicate add-to-list IntegrityError crash

**File:** `backend/app/mcp/email/lists.py:52-57`

**Before:**
```python
for cid in body.contact_ids:
    contact = await session.get(EmailContact, cid)
    if contact and contact.user_id == user.id:
        await session.execute(email_list_contacts.insert().values(...))
return {"added": len(body.contact_ids)}
```

**After:**
```python
existing = set((await session.execute(
    select(email_list_contacts.c.contact_id).where(email_list_contacts.c.list_id == list_id)
)).scalars().all())
added = 0
for cid in body.contact_ids:
    if cid in existing:
        continue
    contact = await session.get(EmailContact, cid)
    if contact and contact.user_id == user.id:
        await session.execute(email_list_contacts.insert().values(...))
        existing.add(cid)
        added += 1
return {"added": added}
```

**Root cause:** `email_list_contacts` has composite PK `(list_id, contact_id)`. Re-adding a contact already in the list raised `IntegrityError` (500). Fix pre-fetches existing contact_ids in one query and skips duplicates. Works on both SQLite and Postgres. Return value now reflects actual additions (idempotent).

### Regression Tests Added

**File:** `backend/tests/test_email_endpoints.py`

1. `test_unsubscribe_duplicate_email_across_users_no_crash` — registers two users, both create a contact with the same email; calls unsubscribe and asserts 200 (not 500); also asserts unknown email returns 404.
2. `test_add_same_contact_twice_is_idempotent` — creates a contact and list; adds contact twice; asserts neither call 500s, second add returns `{"added": 0}`, and `contact_count` stays 1.

### RED Observation

Both bugs are confirmed crash paths: `scalar_one_or_none()` raises `MultipleResultsFound` and bare `insert()` raises `IntegrityError` on composite PK violation.

### GREEN — Full Suite

```
$ cd backend && python -m pytest tests/ -q
103 passed, 4 warnings in 15.54s
```

(101 prior + 2 new = 103 total, 0 failures)
