# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS frontend

WORKDIR /app/QHS
COPY QHS/package.json QHS/package-lock.json ./
RUN npm ci
COPY QHS/ ./
RUN npm run build

FROM composer:2 AS dependencies

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist
COPY app ./app
COPY database ./database
RUN composer dump-autoload --no-dev --no-scripts --optimize

FROM php:8.4-apache-bookworm

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public \
    APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr

COPY deploy/apache.conf /etc/apache2/conf-available/qhs.conf
COPY deploy/php-production.ini /usr/local/etc/php/conf.d/zz-qhs-production.ini

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libicu-dev \
        libonig-dev \
        libpq-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" intl mbstring opcache pdo_mysql pdo_pgsql zip \
    && a2enmod expires headers rewrite \
    && a2enconf qhs \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
        /etc/apache2/sites-available/*.conf \
        /etc/apache2/apache2.conf \
        /etc/apache2/conf-available/*.conf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html
COPY artisan composer.json composer.lock ./
COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY public ./public
COPY resources ./resources
COPY routes ./routes
COPY storage ./storage
COPY --from=dependencies /app/vendor ./vendor
COPY --from=frontend /app/public/app ./public/app
COPY deploy/entrypoint.sh /usr/local/bin/qhs-entrypoint

RUN chmod +x /usr/local/bin/qhs-entrypoint \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && php artisan package:discover --ansi \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 10000

ENTRYPOINT ["qhs-entrypoint"]
CMD ["apache2-foreground"]
