-- Extra product photos shown on the product page; product.image_url stays the cover used on cards.
create table product_image (
    product_id bigint       not null references product (id),
    position   int          not null,
    url        varchar(500) not null,
    primary key (product_id, position)
);
