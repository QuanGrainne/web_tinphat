-- Forgotten password: each admin can have a recovery email, and a reset link carries a single-use token.
alter table app_user add column email citext;
create unique index ux_app_user_email on app_user (email) where email is not null;

-- Only the SHA-256 of the token is stored, so a database copy cannot be used to reset a password.
create table password_reset_token (
    id         bigserial primary key,
    user_id    bigint      not null references app_user (id) on delete cascade,
    token_hash char(64)    not null unique,
    expires_at timestamptz not null,
    used_at    timestamptz,
    created_at timestamptz not null default now()
);

create index ix_password_reset_token_user on password_reset_token (user_id);
