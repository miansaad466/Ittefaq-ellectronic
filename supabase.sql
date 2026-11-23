-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  price integer not null,
  stock integer not null default 0,
  emoji text default '🔌',
  description text default '',
  image_url text default ''
);
-- Lock the table: only the server (service key) can read/write it
alter table products enable row level security;

insert into products (name, category, price, stock, emoji, description) values
('Samsung 55" 4K Smart LED TV','TVs',129999,8,'📺','55-inch 4K UHD display, Smart TV with Netflix and YouTube, HDR, 3 HDMI ports, 1 year warranty.'),
('Haier 1.5 Ton DC Inverter AC','ACs',149999,5,'❄️','Heat and cool inverter AC, saves up to 60% electricity, turbo cooling, 1 year warranty.'),
('Dawlance 14 cu ft Refrigerator','Refrigerators',114999,6,'🧊','Frost-free double door refrigerator, inverter compressor, 10 year compressor warranty.'),
('Haier 8kg Automatic Washing Machine','Home Appliances',89999,7,'🧺','Top-load fully automatic washer, 8kg capacity, quick wash, dryer function.'),
('Redmi Note 13 Smartphone','Mobiles',54999,20,'📱','6.67-inch AMOLED, 108MP camera, 8GB RAM / 256GB storage, 5000mAh battery.'),
('HP 15 Core i5 Laptop','Laptops',139999,9,'💻','Intel Core i5, 16GB RAM, 512GB SSD, 15.6-inch FHD display, Windows 11.'),
('Sony WH-CH520 Wireless Headphones','Audio',12999,25,'🎧','Bluetooth headphones, up to 50 hours battery, built-in mic, lightweight.'),
('Philips Air Fryer 4.1L','Kitchen',24999,15,'🍟','Rapid Air technology, cook with up to 90% less fat, digital timer, easy to clean.'),
('Orient 56" DC Inverter Ceiling Fan','Fans',15999,30,'🌀','Energy-saving DC inverter fan with remote, uses only 30W, silent operation.'),
('Anker 20000mAh Power Bank','Accessories',8499,40,'🔋','Fast charging 20000mAh power bank, dual USB ports, charges a phone up to 4 times.');
