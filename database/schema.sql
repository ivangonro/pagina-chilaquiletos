-- Schema para Supabase (PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase.
-- Nota: la app usa SQLite localmente; este script migra la estructura a Postgres.

create table if not exists users (
  id bigint generated always as identity primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','cajero','cocina')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order integer not null default 0
);

create table if not exists products (
  id bigint generated always as identity primary key,
  category_id bigint not null references categories(id) on delete cascade,
  name text not null,
  description text default '',
  price numeric(10,2) not null check (price >= 0),
  available boolean not null default true,
  image_url text default '',
  created_at timestamptz not null default now()
);

create table if not exists ingredients (
  id bigint generated always as identity primary key,
  name text not null unique,
  unit text not null default 'unidad',
  stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists product_ingredients (
  product_id bigint not null references products(id) on delete cascade,
  ingredient_id bigint not null references ingredients(id) on delete cascade,
  quantity numeric(12,3) not null check (quantity > 0),
  primary key (product_id, ingredient_id)
);

create table if not exists orders (
  id bigint generated always as identity primary key,
  order_number bigint not null unique,
  status text not null default 'pendiente'
    check (status in ('pendiente','preparando','listo','entregado','cancelado')),
  customer_name text default '',
  table_number text default '',
  payment_method text default '' check (payment_method in ('','efectivo','tarjeta','transferencia')),
  total numeric(10,2) not null default 0,
  created_by bigint references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

create table if not exists inventory_movements (
  id bigint generated always as identity primary key,
  ingredient_id bigint not null references ingredients(id) on delete cascade,
  type text not null check (type in ('entrada','salida','ajuste')),
  quantity numeric(12,3) not null,
  reason text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created on orders(created_at);
create index if not exists idx_products_category on products(category_id);
