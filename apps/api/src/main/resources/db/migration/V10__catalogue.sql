create table category (
    id              bigserial primary key,
    parent_id       bigint references category (id),
    name            varchar(200) not null,
    slug            varchar(200) not null unique,
    description     text,
    seo_title       varchar(200),
    seo_description varchar(400),
    sort_order      int          not null default 0,
    visible         boolean      not null default true,
    version         bigint       not null default 0,
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now()
);

create index ix_category_parent on category (parent_id);

create table brand (
    id          bigserial primary key,
    name        varchar(200) not null,
    slug        varchar(200) not null unique,
    description text,
    sort_order  int          not null default 0,
    visible     boolean      not null default true,
    version     bigint       not null default 0,
    created_at  timestamptz  not null default now(),
    updated_at  timestamptz  not null default now()
);

create table product (
    id                 bigserial primary key,
    name               varchar(300) not null,
    slug               varchar(300) not null unique,
    brand_id           bigint references brand (id),
    category_id        bigint references category (id),
    description_md     text,
    spec_line          varchar(300),
    image_url          varchar(500),
    seo_title          varchar(200),
    seo_description    varchar(400),
    published          boolean      not null default false,
    first_published_at timestamptz,
    status             varchar(20)  not null default 'ACTIVE' check (status in ('ACTIVE', 'DISCONTINUED')),
    internal_note      text,
    search_text        text         not null default '',
    version            bigint       not null default 0,
    created_at         timestamptz  not null default now(),
    updated_at         timestamptz  not null default now()
);

create index ix_product_category_published on product (category_id, published);
create index ix_product_brand on product (brand_id);

create table sku (
    id                 bigserial primary key,
    product_id         bigint       not null references product (id),
    code               varchar(80)  not null,
    code_key           varchar(80)  not null unique,
    name               varchar(300),
    unit_name          varchar(60)  not null,
    conversion         int          not null check (conversion > 0),
    is_base            boolean      not null default false,
    price              bigint check (price >= 0),
    price_visible      boolean      not null default true,
    needs_confirmation boolean      not null default false,
    promo_price        bigint,
    promo_from         date,
    promo_to           date,
    source             varchar(20)  not null default 'MANUAL',
    visible            boolean      not null default true,
    sort_order         int          not null default 0,
    version            bigint       not null default 0,
    created_at         timestamptz  not null default now(),
    updated_at         timestamptz  not null default now()
);

create index ix_sku_product on sku (product_id);
create unique index ux_sku_one_base on sku (product_id) where is_base;

create table price_history (
    id         bigserial primary key,
    sku_id     bigint      not null references sku (id),
    field      varchar(10) not null check (field in ('PRICE', 'PROMO')),
    old_price  bigint,
    new_price  bigint,
    promo_from date,
    promo_to   date,
    source     varchar(10) not null check (source in ('MANUAL', 'SEED')),
    changed_by varchar(80),
    changed_at timestamptz not null default now()
);

create index ix_price_history_sku on price_history (sku_id, changed_at desc);
