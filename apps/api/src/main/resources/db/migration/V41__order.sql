create table customer_order (
    id                   bigserial primary key,
    code                 varchar(16)  not null unique,
    submission_id        uuid         not null unique,
    customer_name        varchar(200) not null,
    phone                varchar(40)  not null,
    phone_norm           varchar(20)  not null,
    address              text         not null,
    note                 text,
    payment_method       varchar(20)  not null check (payment_method in ('COD', 'BANK_TRANSFER')),
    status               varchar(20)  not null default 'PENDING'
        check (status in ('PENDING', 'CONFIRMED', 'PAID', 'ENTERED_KIOTVIET', 'SHIPPING', 'COMPLETED', 'CANCELLED')),
    kiotviet_order_code  varchar(80),
    subtotal             bigint       not null,
    discount_total       bigint       not null default 0,
    discount_note        varchar(200),
    shipping_fee         bigint check (shipping_fee >= 0),
    total                bigint       not null,
    paid_amount          bigint,
    paid_note            text,
    paid_by              varchar(120),
    paid_via             varchar(20) check (paid_via in ('MANUAL', 'BANK_WEBHOOK')),
    paid_at              timestamptz,
    amount_reissued_at   timestamptz,
    amount_reissue_note  text,
    assignee_id          bigint references app_user (id),
    internal_note        text,
    client_ip            varchar(64),
    created_at           timestamptz  not null default now(),
    updated_at           timestamptz  not null default now(),
    version              bigint       not null default 0
);

create index ix_customer_order_phone_code on customer_order (phone_norm, code);
create index ix_customer_order_status on customer_order (status, created_at desc);
create index ix_customer_order_created on customer_order (created_at desc);

create table order_item (
    id           bigserial primary key,
    order_id     bigint       not null references customer_order (id),
    sku_id       bigint       not null references sku (id) on delete restrict,
    sku_code     varchar(80)  not null,
    product_name varchar(300) not null,
    unit_name    varchar(60)  not null,
    conversion   int          not null,
    qty          int          not null check (qty > 0),
    list_price   bigint       not null,
    unit_price   bigint       not null,
    line_total   bigint       not null
);

create index ix_order_item_order on order_item (order_id);
create index ix_order_item_sku on order_item (sku_id);
