# Firebase Security Specification - EAZY BILLING

## Data Invariants
1. **Identity Isolation**: A user can only access messages where they are the `sender` or `receiver`.
2. **Profile Integrity**: A user can only modify a `company_profile` if they match the `uid` stored in that document.
3. **Transaction Privacy**: Shared invoices/payments/items are only readable by the designated `sender` or `receiver`.
4. **Consistency**: `updated_at` and `timestamp` fields must match server time during writes.

## The "Dirty Dozen" Payloads (Deny Cases)
1. **Spoof Sender**: Create a message with `senderUid` pointing to another user.
2. **Inject Field**: Add `isAdmin: true` to a profile document.
3. **Ghost Message**: Send a message to someone else by bypassing the `receiverUid` check.
4. **Profile Hijack**: Update the `uid` of a mobile number to your own UID.
5. **PII Leak**: Read a profile document given only a mobile number (if you aren't the owner).
6. **Future Date**: Set `timestamp` to `9999999999`.
7. **Large ID**: Use a 1MB string as a document ID.
8. **Malicious Content**: Set `type` to `system_exploit` in a message.
9. **Duplicate Mobile**: Link multiple UIDs to the same mobile profile.
10. **State Skip**: Update a shared invoice from `pending` to `processed` without being the receiver.
11. **Orphaned Shared Item**: Create a shared item without a valid `senderPhone`.
12. **Quota Attack**: Send a message with 1MB of text.

## Test Runner (Simplified Logic)
- `PERMISSION_DENIED` if `request.auth.uid != resource.data.senderUid && request.auth.uid != resource.data.receiverUid` for messages.
- `PERMISSION_DENIED` if `request.auth.uid != resource.data.uid` for profiles.
- `PERMISSION_DENIED` if `request.resource.data.keys().hasAny(['isAdmin'])`.
