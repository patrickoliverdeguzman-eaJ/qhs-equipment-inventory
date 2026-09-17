# QHS Equipment Inventory

Quirino High School's equipment inventory and borrowing application. Laravel 12 provides the API, authorization, scheduled snapshots, and private Reverb events; React 18, TypeScript, and Vite provide the role-specific user interface.

## Major features

- Student registration, verified sign login, account recovery, profile management, and self-service borrow requests
- Administrator management for users, laboratories, categories, equipment, inventory units, transactions, reports, snapshots, and audit logs
- Laboratory-scoped custodian equipment and transaction workflows
- Atomic unit reservation plus auditable approval, QR-assisted issue, partial return, and rejection transitions
- Laboratory-scoped maintenance, calibration, cleaning, safety-inspection, and validation work orders with recurrence, costs, assignees, and condition outcomes
- Automatic high-priority repair or incident work orders when returned units are damaged, under repair, or missing
- Private real-time transaction updates with polling fallback
- Safe CSV import/export, local QR-label generation, and responsive role-specific navigation

## Architecture

- `app/Http/Controllers` keeps HTTP concerns thin.
- `app/Services/TransactionService.php` owns request creation, reservation, approval, rejection, and assignment; `TransactionCustodyService.php` owns locked issue and per-unit return transitions; `MaintenanceWorkOrderService.php` owns the locked maintenance lifecycle and unit availability changes.
- Policies plus `role` and `active` middleware enforce admin, custodian-laboratory, and borrower boundaries.
- `QHS/src` is the React and TypeScript application. Strictly typed API boundaries cover authentication, navigation, student workflows, and core administration while the remaining reporting modules migrate incrementally. Vite emits production assets to ignored `public/app`; Laravel serves its index for client-side routes.
- Reverb uses authenticated private channels per user, laboratory, and administrator. Ten-second polling remains a resilience fallback.

## Requirements

- PHP 8.2 or newer with OpenSSL, Mbstring, Fileinfo, PDO, and the database driver; DOM/XML is also required for the test suite
- Composer 2
- Node.js 20 or newer and npm
- MySQL 8+ for production; SQLite is used by the automated tests

## Local setup

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
npm --prefix QHS install
composer dev
```

On macOS/Linux use `cp` instead of `copy`. `composer dev` starts Laravel, the queue listener, Reverb, and Vite. The default Vite address is `http://127.0.0.1:5173`.

Create the first administrator without committing a default password:

```bash
php artisan app:create-admin admin@example.edu
```

The command prompts securely for the administrator's name and password. It can also promote an existing account.

## Configuration

Copy both environment examples and set production values:

- Root `.env`: database, delivery-capable SMTP mail, `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`, broadcast connection, and Reverb credentials/origins.
- `QHS/.env`: optional API and Reverb overrides. Same-origin production deployments can use `/api`.

Never use the example Reverb secret in production. Run queue workers and `php artisan reverb:start` under a process supervisor. The scheduler must invoke `php artisan schedule:run` every minute.

Browser authentication uses an encrypted, secure, HttpOnly Sanctum session cookie; bearer credentials and serialized user profiles are not stored in Web Storage. Production intentionally refuses to generate verification or password-reset links through the `log`, `array`, or log-fallback mail transports. Configure the SMTP variables marked `sync: false` in Render before enabling public registration or account recovery.

## Production build

```bash
composer install --no-dev --optimize-autoloader
npm --prefix QHS ci
npm --prefix QHS run build
php artisan storage:link
php artisan migrate --force
php artisan optimize
```

The web server document root must be `public/`. Uploaded files are served through `public/storage`.

The complete [system workflow and function reference](docs/SYSTEM_WORKFLOW_AND_FUNCTION_REFERENCE.md) documents every role, route, lifecycle stage, controller, service, model, and frontend workflow.

## Render deployment

The repository includes a production Docker image and `render.yaml` Blueprint for a single-service HTTPS deployment backed by Render Postgres. Deploy the Blueprint from the repository root; Render supplies `APP_KEY`, `DB_URL`, and its public URL automatically. The container runs migrations and Laravel cache warm-up before Apache starts.

The free Render plans are suitable for previews: the web service sleeps when idle, uploaded files use ephemeral local storage, and the free PostgreSQL database expires after 30 days. Use a persistent database and object storage before treating the deployment as the permanent system of record, and complete the required SMTP settings before enabling public registration or recovery. Reverb is disabled in the one-port preview deployment; the interface continues to work using normal API refreshes.

The container refuses to boot in production when debug mode is enabled or the public URL is not HTTPS. It also excludes local SQLite files, tests, frontend sources, and internal documentation from the runtime image. Initial administrator creation is an explicit one-time operation: set `BOOTSTRAP_ADMIN_ENABLED=true` together with the email and password variables for the first deploy, then remove all three bootstrap variables.

## Verification

```bash
php artisan test
vendor/bin/pint --test
npm --prefix QHS run lint
npm --prefix QHS run typecheck
npm --prefix QHS run test
npm --prefix QHS run build
composer audit
npm --prefix QHS audit --omit=dev
```

The feature suite covers authentication and role boundaries, custody authorization, exact-unit issue validation, QR URL parsing, partial/final returns, condition findings, overdue derivation, legacy backfill, maintenance lifecycle and recurrence, repair creation from damaged returns, audit actions, private channels, and immediate inventory release.

## Import and export

Equipment import templates and browser-side reports use UTF-8 CSV, which opens directly in Excel and avoids the unpatched vulnerabilities in the former SheetJS dependency. Imports are limited to 500 rows, 5,000 created units, 2 MB, and two requests per minute; unit rows are inserted in bounded batches. Exports neutralize spreadsheet-formula prefixes. Inventory snapshot exports stream rows instead of retaining the full report in memory.
