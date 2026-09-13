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

sed -ri "s/^Listen [0-9]+$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

php artisan storage:link --force
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
