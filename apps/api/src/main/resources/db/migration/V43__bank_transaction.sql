create table bank_transaction (
    id            bigserial primary key,
    vendor        varchar(16)  not null default 'SEPAY',
    vendor_tx_id  varchar(64)  not null,
    reference_code varchar(120),
    gateway       varchar(80),
    account_no    varchar(60),
    direction     varchar(3)   not null check (direction in ('IN', 'OUT')),
    amount        bigint       not null check (amount >= 0),
    content       text,
    vendor_code   varchar(120),
    tx_time       timestamptz  not null default now(),
    raw           jsonb        not null,
    source        varchar(12)  not null default 'WEBHOOK' check (source in ('WEBHOOK', 'RECONCILE')),
    status        varchar(12)  not null default 'RECEIVED'
        check (status in ('RECEIVED', 'MATCHED', 'REVIEW', 'IGNORED')),
    review_reason varchar(40),
    order_id      bigint references customer_order (id),
    decision_note text,
    decided_by    varchar(120),
    decided_at    timestamptz,
    alerted_at    timestamptz,
    created_at    timestamptz  not null default now(),
    version       bigint       not null default 0,
    constraint ux_bank_transaction_vendor_tx unique (vendor, vendor_tx_id)
);

create index ix_bank_transaction_status on bank_transaction (status, created_at);
create index ix_bank_transaction_order on bank_transaction (order_id);
