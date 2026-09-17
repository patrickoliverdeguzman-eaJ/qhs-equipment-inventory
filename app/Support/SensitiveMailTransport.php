<?php

namespace App\Support;

use RuntimeException;

final class SensitiveMailTransport
{
    public static function assertSafe(): void
    {
        if (! app()->isProduction()) {
            return;
        }

        $mailer = (string) config('mail.default');

        if ($mailer === '' || self::doesNotDeliverSecurely($mailer)) {
            throw new RuntimeException('A delivery-capable mail transport is required for sensitive account links.');
        }
    }

    private static function doesNotDeliverSecurely(string $mailer, array $visited = []): bool
    {
        if (in_array($mailer, $visited, true)) {
            return true;
        }

        $configuration = config("mail.mailers.{$mailer}");

        if (! is_array($configuration)) {
            return true;
        }

        $transport = $configuration['transport'] ?? $mailer;

        if (in_array($transport, ['array', 'log'], true)) {
            return true;
        }

        if (! in_array($transport, ['failover', 'roundrobin'], true)) {
            return false;
        }

        $children = $configuration['mailers'] ?? [];

        return $children === [] || collect($children)->contains(
            fn ($child): bool => self::doesNotDeliverSecurely((string) $child, [...$visited, $mailer])
        );
    }
}
