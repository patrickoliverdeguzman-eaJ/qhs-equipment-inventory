# QHS Engineering Audit Report

Audit completed against the original `robyralphh/QHS-final-boss` codebase. The application was repaired in place rather than rebuilt, and the existing Laravel + React product structure and core borrowing behavior were preserved.

## 1. Problems Found

- Sensitive APIs were reachable without effective role or record-level authorization, creating IDOR and privilege-escalation paths.
- Borrower identity came from request fields, and transaction/item updates could produce spoofed identities, duplicate transitions, or inconsistent inventory state.
- Email verification could be completed through an unsigned request; reset tokens were stored in plaintext and had weak lifecycle handling.
- Reverb used a shared public channel, while frontend URLs and WebSocket settings assumed localhost.
- Migrations had missing columns/tables, duplicate schema changes, table-name inconsistencies, lossy condition changes, and rollback failures.
- Several uploads trusted client-provided extensions or removed the previous file before a successful record update.
- Reports interpolated user-derived values into `document.write`, CSV exports allowed spreadsheet formulas, and QR labels depended on third-party services.
- Large transaction-history and inventory screens issued repeated requests or loaded unrestricted data.
- Authentication routes, redirect handling, null state, logout semantics, and responsive form behavior were inconsistent.
- PHP and npm dependency trees contained outdated or vulnerable packages; the former SheetJS package had no patched release in its distribution channel.

## 2. Root Causes

- Authorization was implemented mainly as hidden frontend controls instead of server-side middleware and policies.
- Multi-record borrowing operations were spread across controllers without locking or a single transaction boundary.
- Historical migrations accumulated overlapping fixes without being tested as a complete up/down sequence.
- Frontend modules embedded environment, export, and realtime behavior directly in large views.
- The repository retained starter configuration, duplicate build systems, and framework defaults that no longer matched the actual SPA.

## 3. Changes Made

- Upgraded to Laravel 12 and current compatible Composer/npm packages; removed unused Octane, SheetJS, and lodash dependencies.
- Added missing schema, corrected relationships/casts, repaired migration order and rollback behavior, and preserved equipment-condition data.
- Rebuilt authentication verification/reset handling around signed URLs, hashed expiring tokens, generic recovery responses, token revocation, throttling, and active-account checks.
- Added validated CRUD boundaries, safe upload naming, streaming/neutralized CSV output, local QR generation, and sanitized print documents.
- Reworked the SPA entry/build setup so Laravel serves chunked production assets while Vite proxies local development requests.
- Replaced generic project documentation and metadata with QHS-specific setup, operations, and verification guidance.

## 4. Architecture Improvements

- `TransactionService` now owns atomic request creation, edits, reservation, assignment, acceptance, rejection, return, release, and deletion rules.
- Form Requests validate role-sensitive payloads; policies enforce equipment, laboratory, and transaction ownership/scope.
- API resources provide stable transaction, equipment, laboratory, item, category, and user response shapes.
- Middleware aliases enforce active users, token abilities, and roles; response security headers apply globally.
- Snapshot capture is centralized in a service shared by the console command and administrative endpoint.

## 5. UI Improvements

- Introduced a branded, accessible authentication shell with consistent login, registration, verification, recovery, and reset states.
- Fixed protected-route redirects, session revalidation, disabled/loading behavior, field labels, feedback, and mobile overflow.
- Added role-aware navigation and reusable environment-relative API/asset helpers.
- Production routes are lazy-loaded and split into React, MUI, chart, realtime, and feature chunks.
- Verified authentication layouts at mobile and desktop breakpoints with no horizontal overflow.

## 6. Security Improvements

- Protected every sensitive route with Sanctum, scoped token abilities, active-account checks, roles, and record policies.
- Derived borrower identity from trusted user records and blocked cross-laboratory custodian actions.
- Replaced public realtime broadcasts with authenticated private user, laboratory, and administrator channels.
- Prevented removal of the final active administrator and revoked tokens when accounts are disabled.
- Added stronger password rules, eight-hour token expiry, encrypted sessions by default, safe redirect handling, and baseline browser security headers.
- Hardened uploads, print views, CSV cells, exception responses, CORS origins, Reverb origins, and environment examples.

## 7. Performance Improvements

- Added targeted foreign-key/status/date indexes and removed duplicate index creation.
- Added pagination or hard limits to large API collections and bounded snapshot date ranges.
- Replaced the unit-history N+1 request cascade with one scoped endpoint.
- Streamed snapshot CSV exports and removed large in-memory workbook generation.
- Added route-level lazy loading and deterministic vendor chunks to reduce the initial SPA payload.

## 8. Tests Performed

- `composer validate --strict`
- `composer audit`
- PHP syntax checks across application, configuration, migration, route, and test files
- `vendor/bin/pint --test`
- `phpunit --testdox` (11 tests, 41 assertions)
- Isolated SQLite `migrate:fresh --seed` followed by a full `migrate:rollback`
- `php artisan route:list --except-vendor`, `schedule:list`, `config:cache`, and `route:cache`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- Live browser checks at 320, 375, 390, 768, 1024, and 1440 pixel widths, plus blank-form validation, DOM geometry/overflow checks, and console-error inspection

Feature coverage includes unauthenticated access, role restrictions, inactive accounts, unverified login, unsigned verification rejection, borrower spoofing, atomic unit reservation, transaction IDOR, custodian laboratory scope, duplicate transitions, returns, borrower edits, and final-administrator protection.

## 9. Remaining Issues

- MySQL-specific SQL was reviewed and corrected, but this workstation only provided SQLite for executable database tests. Run the same migration and workflow suite against a production-like MySQL staging database before deployment.
- Reverb channel authorization and frontend listeners were booted and inspected, but a complete multi-client WebSocket test requires deployed Reverb credentials, a queue worker, and the target proxy/TLS topology.
- Email templates and failure handling were tested through application paths; actual delivery requires the deployment's SMTP provider.
- Authenticated dashboard visuals were source-reviewed and build-tested. End-to-end browser coverage for every administrative form should be added once disposable role fixtures are available in a dedicated staging environment.

## 10. Files Changed

- Backend: `app/Http`, `app/Policies`, `app/Services`, `app/Events`, `app/Models`, `app/Providers`, and `app/Console`
- Database: migrations, factories, and seeders
- Runtime: `bootstrap/app.php`, API/web/channel/console routes, and security/realtime/auth configuration
- Frontend: `QHS/src` layouts, routes, views, API/realtime/CSV/print helpers, styles, and Vite configuration
- Dependencies and metadata: Composer/npm manifests and lockfiles, environment examples, root README, and this report
- Tests: `tests/Feature/SecurityAndTransactionWorkflowTest.php`
