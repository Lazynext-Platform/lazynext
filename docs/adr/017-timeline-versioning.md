# ADR-017: Timeline Version History

## Date
2026-08-28

## Status
Accepted

## Context
Timeline edits in the visual editor need an undo/restore capability. Users iterating on a rough cut may want to revert to an earlier state after a series of changes. Without version history, a mistake requires manually re-entering all clip data.

## Decision
1. Added a `TimelineVersion` Prisma model that stores sequential version snapshots per timeline
2. `versionNum` is sequential per timeline, enforced by a unique constraint on `(timelineId, versionNum)`
3. API at `/api/editor/timeline-versions`:
   - `GET` — list all versions for a timeline (newest first)
   - `POST` — create a snapshot of the current timeline state (increments `versionNum`)
   - `PUT` — restore a specific version; before restoring, a pre-restore snapshot is created first, making restores themselves undoable
   - `DELETE` — remove a specific version
4. All operations verify timeline ownership via the parent `Timeline.userId` relationship

## Consequences
- Storage grows linearly with the number of versions saved per timeline
- Restore is non-destructive — it creates a new version capturing the pre-restore state, so a restore can itself be undone
- The unique constraint on `(timelineId, versionNum)` prevents version number collisions
- Users must explicitly save versions (no automatic snapshotting on every edit) to control storage growth
- Ownership verification on every operation prevents cross-user access to another user's timeline versions
