-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Roles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- PostgreSQL 13+ use gen_random_uuid()
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- PRODUCT_CREATE, ORDER_APPROVE
  description TEXT
);

CREATE TABLE role_permissions (
  role_id INT REFERENCES roles(id),
  permission_id INT REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id),
  role_id INT REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

-- 2. Products & Categories
CREATE TABLE product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INT REFERENCES product_categories(id)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id INT REFERENCES product_categories(id),
  unit TEXT NOT NULL, -- adet, kg
  min_stock INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE product_prices (
  id SERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  price NUMERIC(12,2) NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- 3. Warehouses & Stock
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  warehouse_id UUID REFERENCES warehouses(id),
  quantity INT NOT NULL,
  movement_type TEXT CHECK (movement_type IN (
    'IN','OUT','TRANSFER_IN','TRANSFER_OUT','COUNT_DIFF','SCRAP'
  )),
  reference_type TEXT, -- PURCHASE_ORDER, SALES_ORDER
  reference_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE VIEW stock_current AS
SELECT product_id, warehouse_id, SUM(quantity) AS stock
FROM stock_movements
GROUP BY product_id, warehouse_id;

-- 4. Suppliers & Purchasing
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id),
  status TEXT CHECK (status IN ('DRAFT','APPROVED','PARTIAL','COMPLETED')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  received_quantity INT DEFAULT 0,
  price NUMERIC(12,2)
);

-- 5. Customers & Sales
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT
);

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  status TEXT CHECK (status IN (
    'DRAFT','APPROVED','PICKING','SHIPPED','COMPLETED','CANCELLED'
  )),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE sales_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES sales_orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price NUMERIC(12,2)
);

-- 6. Finance
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_order_id UUID REFERENCES sales_orders(id),
  total_amount NUMERIC(12,2),
  tax_amount NUMERIC(12,2),
  status TEXT CHECK (status IN ('DRAFT','ISSUED','PAID')),
  issued_at TIMESTAMP
);

-- 7. Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_stock_product_warehouse ON stock_movements(product_id, warehouse_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
