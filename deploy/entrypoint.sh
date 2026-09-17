#!/usr/bin/env sh
set -eu

PORT="${PORT:-10000}"
: "${APP_KEY:?APP_KEY is required}"

# Render's generated secret is intentionally opaque, while Laravel's
# AES-256-CBC encrypter requires exactly 32 bytes. Preserve an already valid
# Laravel key; otherwise deterministically normalize the secret without
# printing it or committing it to the image.
if ! php -r '$key = (string) getenv("APP_KEY"); $raw = str_starts_with($key, "base64:") ? base64_decode(substr($key, 7), true) : $key; exit(is_string($raw) && strlen($raw) === 32 ? 0 : 1);'; then
    APP_KEY="base64:$(php -r 'echo base64_encode(hash("sha256", (string) getenv("APP_KEY"), true));')"
    export APP_KEY
fi

if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
    export APP_URL="${APP_URL:-$RENDER_EXTERNAL_URL}"
    export FRONTEND_URL="${FRONTEND_URL:-$RENDER_EXTERNAL_URL}"
    export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-$RENDER_EXTERNAL_URL}"
fi

if [ "${APP_ENV:-production}" = "production" ]; then
    case "$(printf '%s' "${APP_DEBUG:-false}" | tr '[:upper:]' '[:lower:]')" in
        1|true|yes|on)
            echo "Refusing to start production with APP_DEBUG enabled." >&2
            exit 1
            ;;
    esac

    case "${APP_URL:-}" in
        https://*) ;;
        *)
            echo "Refusing to start production without an HTTPS APP_URL." >&2
            exit 1
            ;;
    esac
fi

sed -ri "s/^Listen [0-9]+$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

php artisan storage:link --force
php artisan migrate --force

if [ "${BOOTSTRAP_ADMIN_ENABLED:-false}" = "true" ] && [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ]; then
    php artisan app:create-admin "$BOOTSTRAP_ADMIN_EMAIL" \
        --name="${BOOTSTRAP_ADMIN_NAME:-Administrator}" \
        --password-env=BOOTSTRAP_ADMIN_PASSWORD \
        --create-only \
        --no-interaction
fi

# The bootstrap password is never needed by the long-running web process.
unset BOOTSTRAP_ADMIN_PASSWORD

php artisan optimize

exec "$@"
