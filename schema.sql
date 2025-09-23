-- Products Table
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price int not null,
  weight_gram int not null,
  length_cm int,
  width_cm int,
  height_cm int,
  stock int default 0,
  images text[],
  created_at timestamptz default now()
);

-- Orders Table
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  subtotal int not null,
  shipping_courier text,
  shipping_service text,
  shipping_cost int,
  total int not null,
  status text check (status in ('PENDING_PAYMENT','PAID','SHIPPED','DELIVERED')) default 'PENDING_PAYMENT',
  invoice_url text,
  payment_proof_url text,
  tracking_number text,
  tracking_history jsonb default '[]'::jsonb,
  address_json jsonb not null,
  notes text,
  created_at timestamptz default now()
);

create index idx_orders_status on orders(status);
create index idx_orders_user on orders(user_id);
create index idx_orders_tracking on orders(tracking_number);

-- Order Items Table
create table order_items (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_snapshot jsonb not null,
  quantity int not null check (quantity > 0),
  price_each int not null,
  created_at timestamptz default now()
);

create index idx_order_items_order on order_items(order_id);
