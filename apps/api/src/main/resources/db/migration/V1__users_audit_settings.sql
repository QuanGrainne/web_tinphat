create extension if not exists citext;

create table app_user (
    id                  bigserial primary key,
    username            citext       not null unique,
    password_hash       varchar(200) not null,
    display_name        varchar(120) not null,
    role                varchar(20)  not null check (role in ('EDITOR', 'MANAGER')),
    enabled             boolean      not null default true,
    password_changed_at timestamptz  not null default now(),
    created_at          timestamptz  not null default now(),
    updated_at          timestamptz  not null default now()
);

create table audit_log (
    id          bigserial primary key,
    actor_id    bigint references app_user (id),
    actor_name  varchar(120) not null,
    action      varchar(40)  not null,
    entity_type varchar(40)  not null,
    entity_id   bigint,
    before      jsonb,
    after       jsonb,
    at          timestamptz  not null default now()
);

create index ix_audit_log_entity on audit_log (entity_type, entity_id, at desc);

create table app_setting (
    key        varchar(80) primary key,
    value      jsonb       not null,
    updated_by varchar(120),
    updated_at timestamptz not null default now()
);
