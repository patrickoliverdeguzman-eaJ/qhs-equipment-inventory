<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Pending = 'pending';
    case Borrowed = 'borrowed';
    case Returned = 'returned';
    case Rejected = 'rejected';
}
