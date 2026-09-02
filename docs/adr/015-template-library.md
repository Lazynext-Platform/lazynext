# ADR-015: Creative Template Library

## Date
2026-08-28

## Status
Accepted

## Context
Users frequently start from common e-commerce creative patterns (product launch hooks, problem-agitate-solve angles, short-form script structures). Without pre-built starting points, every session begins from a blank state, increasing time-to-first-creative and credit spend on boilerplate generation.

There was no mechanism to save a successful creative configuration and reuse it later, nor any shared set of curated templates authored by the platform.

## Decision
1. Added a `CreativeTemplate` Prisma model with the following discriminator:
   - `userId = null` → built-in template shared across all users
   - `userId = <X>` → user-saved template private to that user
2. Templates are categorized into 5 categories: `brief`, `hooks`, `angles`, `script`, `skill-bundle`
3. 15 built-in templates are auto-seeded on first access (lazy seed — if the built-in count is zero, the seed runs)
4. Full CRUD API at `/api/creative/templates`:
   - `GET` — list templates (built-ins + user's own), filterable by category and searchable by name
   - `POST` — create a user-saved template
   - `PUT` — update a user-saved template (built-ins are read-only)
   - `DELETE` — delete a user-saved template (built-ins cannot be deleted)
5. A `/templates` page provides the UI with category filters, search, favorites, and a preview modal
6. A "Templates" nav link is added to the header (visible on lg+ breakpoints)

## Consequences
- Built-in templates are shared across all users and cannot be modified or deleted by individual users
- User-saved templates are private to the owning user
- A favorites system allows quick access to frequently used templates (stored per-user)
- The lazy seed approach means the first request after deployment incurs a one-time seed cost
- Templates reduce time-to-first-creative and provide a consistent starting point for common patterns
