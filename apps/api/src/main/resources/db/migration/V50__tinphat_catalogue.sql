-- Tin Phát Decor catalogue: category cover image and the company shown on the site.
alter table category add column image_url varchar(500);

update app_setting
   set value = '{"name": "CÔNG TY TNHH SẢN XUẤT TIN PHÁT",
                 "taxCode": "",
                 "address": "Cầu chợ trâu Hải Hưng, Ninh Bình",
                 "warehouse": "",
                 "phone": "0914 794 472",
                 "email": "tinphatdecord@gmail.com"}'::jsonb
 where key = 'company';

update app_setting set value = '"tinphatdecord@gmail.com"'::jsonb where key = 'notify.ownerEmail';
update app_setting set value = '["Sản xuất & Phân phối", "Hotline 0914 794 472"]'::jsonb where key = 'site.trustStrip';
update app_setting set value = '"0914 794 472"'::jsonb where key = 'site.hotline';
update app_setting set value = '"0914794472"'::jsonb where key = 'site.zalo';
