create table quote_request (
    id                bigserial primary key,
    code              varchar(16)  not null unique,
    submission_id     uuid         not null unique,
    customer_name     varchar(200) not null,
    phone             varchar(40)  not null,
    phone_norm        varchar(20)  not null,
    email             varchar(200),
    company           varchar(300),
    tax_code          varchar(40),
    note              text,
    status            varchar(20)  not null default 'NEW'
        check (status in ('NEW', 'QUOTED', 'WON', 'CANCELLED')),
    assignee_id       bigint references app_user (id),
    internal_note     text,
    subtotal          bigint       not null default 0,
    has_contact_lines boolean      not null default false,
    client_ip         varchar(64),
    created_at        timestamptz  not null default now(),
    updated_at        timestamptz  not null default now(),
    version           bigint       not null default 0
);

create index ix_quote_request_status on quote_request (status, created_at desc);
create index ix_quote_request_created on quote_request (created_at desc);

create table quote_item (
    id           bigserial primary key,
    quote_id     bigint       not null references quote_request (id),
    sku_id       bigint       not null references sku (id) on delete restrict,
    sku_code     varchar(80)  not null,
    product_name varchar(300) not null,
    unit_name    varchar(60)  not null,
    conversion   int          not null,
    qty          int          not null check (qty > 0),
    unit_price   bigint,
    line_total   bigint
);

create index ix_quote_item_quote on quote_item (quote_id);
create index ix_quote_item_sku on quote_item (sku_id);
