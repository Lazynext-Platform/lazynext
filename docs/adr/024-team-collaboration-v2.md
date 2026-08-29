# ADR-024: Team Collaboration v2

## Date
2026-08-29

## Status
Accepted

## Context
The platform had basic team infrastructure (create, invite, join, role management) but no real-time collaboration features. Users could not see who was online, what they were working on, or what activity was happening in their team. The existing `/api/teams` routes provided CRUD operations but no presence, activity feed, or shared workspace UI.

For a production-grade creative platform, teams need:
- Real-time presence (who's online, what page they're viewing)
- Activity feed (what teammates have been doing)
- A unified workspace page showing members, presence, and activity
- Role-based permissions (already existed: owner, editor, viewer)

## Decision
1. Added `TeamActivity` Prisma model — records team events (member joined, role changed, project created, etc.) with user, type, summary, and metadata
2. Created `/api/teams/[id]/activity` — GET (paginated activity feed) and POST (record activity)
3. Created `/api/teams/[id]/presence` — polling-based real-time presence using in-memory store with 30s TTL
   - GET returns all online members with their current page
   - POST (heartbeat) updates the caller's presence and returns current members
   - DELETE removes the caller's presence (on page unload)
4. Created `TeamWorkspace` component with:
   - Members list with online indicators and role management
   - Invite form (owner only) with email and role selection
   - Online presence section showing who's viewing what
   - Activity feed with typed icons and timestamps
   - Automatic heartbeat every 15 seconds
   - Presence polling every 20 seconds
   - Activity polling every 30 seconds
   - Cleanup on page unload (DELETE presence)
5. Created `/teams` listing page (create team, list teams)
6. Created `/teams/[id]` workspace page (auth-gated, renders TeamWorkspace)
7. Added team workspace to dashboard Quick Create grid
8. Localized all UI strings in 13 locales

## Consequences
- Real-time presence uses polling (not WebSocket) because Cloudflare Workers don't support persistent WebSocket connections in the current deployment
- The in-memory presence store is per-Worker-isolate; for multi-isolate deployments, a Durable Object or KV store would be needed
- Activity feed is persisted in D1, so it survives Worker restarts and is consistent across isolates
- The 30-second TTL means presence updates have up to 30 seconds of staleness
- Heartbeat every 15 seconds balances responsiveness with API call frequency
- The activity API records events from both UI actions and programmatic calls, enabling future automation
