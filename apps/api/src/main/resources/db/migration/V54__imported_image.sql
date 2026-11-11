-- Pictures copied from another server (KiotViet's CDN) into the uploads directory. Keyed by the original address, so
-- importing the same file again reuses the copy instead of downloading and storing the picture twice.
create table imported_image (
    source_url varchar(500) primary key,
    local_url  varchar(500) not null,
    created_at timestamptz  not null default now()
);
