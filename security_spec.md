# MySphere Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Private Subtree**: All personal productivity records (`tasks`, `goals`, `goalChecklistItems`, `notes`, `habits`, `habitCompletions`, `calendarEvents`, `focusSessions`, `journalEntries`, `wishlist`, `expenses`, `private/info`) reside under `/users/{userId}/...` and are readable/writable exclusively by `request.auth != null && request.auth.uid == userId`. Goal checklist items additionally enforce parent goal existence via `existsAfter`/`exists`. Uploaded Wishlist and Journal images in Firebase Storage (`/users/{userId}/wishlist/...`, `/users/{userId}/journal/...`) enforce owner-only authenticated access, `image/*` content type, and `< 10 MB` file size.
2. **PII Isolation**: User email addresses, private monthly budget settings, and notification preferences are stored strictly inside `/users/{userId}/private/info` and are never written to `/users/{userId}` or `/usernames/{username}`.
3. **Username Uniqueness**: `/usernames/{username}` maps lowercase `^[a-z0-9_]{3,24}$` to a single `uid` and cannot be overwritten by another user (`allow update: if false`).
4. **Friend Request Integrity**: A `friendRequest` must have `fromUid == request.auth.uid`, `fromUid != toUid`, and start with `status == 'pending'`. Once `status` becomes `'accepted'` or `'rejected'`, it is terminal and locked against further status updates.
5. **Participant-Scoped Shared Entities**: `friendships`, `sharedGoals`, and `challenges` can only be listed or read when `request.auth.uid` is explicitly present in `resource.data.users` or `resource.data.participantUids`.
6. **Temporal Integrity & Immutability**: Every entity enforces `createdAt == request.time` on create, `createdAt == existing().createdAt` and `updatedAt == request.time` on update, and immutable `userId` / `creatorUid` / `uid`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Unauthenticated request attempts to create `/users/{uid}/tasks/{id}` (`request.auth == null`) -> `PERMISSION_DENIED`.
2. **Cross-User Task Read**: User B attempts `get` or `list` on `/users/{userA}/tasks` -> `PERMISSION_DENIED`.
3. **PII Leak Attempt**: User B attempts `get` on `/users/{userA}/private/info` -> `PERMISSION_DENIED`.
4. **Ghost Field Shadow Update**: User A sends `{ ..., isAdmin: true }` when updating `/users/{userA}` -> `PERMISSION_DENIED` (`hasOnly` rejection).
5. **Identity Spoofing on Task**: User A creates `/users/{userA}/tasks/{id}` with `userId: userB` -> `PERMISSION_DENIED`.
6. **Resource Poisoning via Oversized ID**: User A sends a 200-char document ID `{taskId}` -> `PERMISSION_DENIED` (`isValidId` check).
7. **Timestamp Forgery**: User A creates a goal with `createdAt` set to a past client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
8. **Self-Friend Request**: User A creates `friendRequests/{id}` with `fromUid == toUid` -> `PERMISSION_DENIED`.
9. **Sender Self-Accepting Request**: User A (sender) attempts to update `friendRequests/{id}` from `'pending'` to `'accepted'` -> `PERMISSION_DENIED` (only `toUid` may respond).
10. **Terminal State Reversal**: User B attempts to change an `'accepted'` friendRequest back to `'pending'` -> `PERMISSION_DENIED`.
11. **Shared Goal Intrusion**: Non-participant User C attempts `get` or `update` on `/sharedGoals/{id}` -> `PERMISSION_DENIED`.
12. **Blanket Collection Scrape**: User A attempts `list` on `/users` or `/usernames` or `/sharedGoals` without participant constraint -> `PERMISSION_DENIED`.
