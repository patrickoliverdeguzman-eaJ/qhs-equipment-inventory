#!/usr/bin/env sh
set -eu

PORT="${PORT:-10000}"

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
