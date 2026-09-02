# ADR-216: CORS `Access-Control-Allow-Origin: *` on Media Storage

**Date:** 2026-09-02
**Status:** Accepted

## Context

The media storage endpoints (`/api/lazynext-studio/media/[key]` in production,
local file serving in development) return `Access-Control-Allow-Origin: *` on
all media responses. This allows any website to embed or fetch media served by
LazyNext.

A security review flagged this as potentially overly permissive.

## Decision

Keep `Access-Control-Allow-Origin: *` on media storage responses.

### Rationale

1. **Shared links**: LazyNext's share-link feature allows users to share
   creatives with team members and stakeholders. The shared pages may be viewed
   from any origin (e.g., a client's dashboard, a Slack preview, an email
   client). Without `*`, the media would be blocked by CORS on non-LazyNext
   origins.

2. **Media keys are unguessable**: Media keys are generated as
   `crypto.randomUUID()`-based paths. They are not enumerable, not predictable,
   and not derivable from user IDs or other public information. The only way to
   access a media item is to know its exact key.

3. **No sensitive data in media**: Media items are creative assets (images,
   videos, audio) intended for public advertising. They are not user PII,
   credentials, or private documents.

4. **Cache headers**: Media responses include
   `Cache-Control: public, max-age=31536000, immutable`, which is appropriate
   for CDN-cached public assets.

5. **Auth-gated upload**: While media *serving* is public, media *upload* and
   *deletion* require authentication and credit deduction. Only authenticated
   users can create or modify media.

## Consequences

- Any origin can fetch media by key.
- Media keys must remain unguessable (UUID-based).
- No user PII should be stored as media.
- This is consistent with how other media-serving platforms (Cloudinary, S3
  public buckets, Imgix) handle public asset delivery.
