# Firebase Security Specification

## 1. Data Invariants
- **Authentication Requirement**: Every read and write operation must be authenticated. Anonymous users are blocked; we strictly enforce `request.auth.uid != null` and `request.auth.token.email_verified == true`.
- **Identity Lock**: No user can read or write documents owned by other users. The `userId` property inside any document must match `request.auth.uid`.
- **Value Constraints**:
  - `amount`, `targetAmount`, `currentSavings`, and `limitAmount` must be positive numeric values.
  - Category and notes strings must have restricted lengths to avoid resource depletion.
  - Transactions must have a type of "income" or "expense".
  - Pending payments must have a type of "owe" or "owed".

## 2. The "Dirty Dozen" Malicious Payloads (Integrity Breaking Attempts)
Below are 12 specific payloads or actions designed to bypass client-side code, which our `firestore.rules` will strictly prevent:

1. **Attempting to read another user's transaction**: Querying matches where `userId` is different from the logged-in UID.
2. **Identity Spoofing in Transaction Creation**: Submitting `userId` set to external target UID `victim_123` instead of the sender's UID.
3. **Ghost fields in Transaction**: Sending a transaction with a hidden field `isAdminPrivilege: true` to bypass verification rules.
4. **Invalid type selection for Transactions**: Creating a transaction with `type` set to "capital_gains" instead of "income" or "expense".
5. **Faking Transaction positive values**: Submitting a negative amount like `-50000` to manipulate accounting equations.
6. **Extremely large payload string denial-of-wallet attack**: Submitting a 500KB notes string on a transaction object.
7. **Bypassing Category budgets month format**: Creating a budget limit with month formatted as "June 2026" instead of "2026-06".
8. **Immutability violation on Goals**: Attempting to alter a `goalId`'s `createdAt` or initial `userId` values during an active edit.
9. **State bypass on Pending Payments**: Modifying the `completed` value to arbitrary text instead of boolean `true`/`false`.
10. **Creating orphaned records**: Referencing an invalid format path for transaction creation.
11. **Malicious document ID injection**: Creating a transaction with a 2KB, special-character-stuffed document ID (e.g., `../sneaky/injection`).
12. **Blanket Query read**: Reading the entire `transactions` collection without restricting the query filters inside the code.

## 3. The Rules Architecture
Rules are structured to use standalone validate helpers `isValidTransaction()`, `isValidPendingPayment()`, `isValidSavingsGoal()`, and `isValidBudgetLimit()`. A robust global catch-all `allow: if false` is added at the root. All update operations will evaluate the change-diff and use `affectedKeys().hasOnly()` gates to prevent state shortcutting or ghost field injections.
