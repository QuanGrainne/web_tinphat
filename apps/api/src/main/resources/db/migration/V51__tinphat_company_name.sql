-- The company name carries the accent shown on its sign: Tín Phát.
update app_setting
   set value = jsonb_set(value, '{name}', '"CÔNG TY TNHH SẢN XUẤT TÍN PHÁT"')
 where key = 'company';
