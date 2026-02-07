# ERP System Documentation

## Entity Relationship Diagram (Textual)

### 1. User & Auth
- **Users** have multiple **Roles** (Many-to-Many via `user_roles`).
- **Roles** have multiple **Permissions** (Many-to-Many via `role_permissions`).
- **Users** perform actions tracked in **Audit Logs** (One-to-Many).

### 2. Products
- **Products** belong to a **Category** (Many-to-One).
- **Products** have a price history in **Product Prices** (One-to-Many).
- **Products** are referenced in **Stock Movements**, **Purchase Order Items**, and **Sales Order Items**.

### 3. Inventory & Stock
- **Stock Movements** link **Products** and **Warehouses**.
- **`stock_current`** is a VIEW aggregating `stock_movements`.
- **Stock Movements** can reference **Purchase Orders** or **Sales Orders**.

### 4. Sales & Purchasing
- **Purchase Orders** belong to **Suppliers**.
- **Purchase Orders** contain items referencing **Products**.
- **Sales Orders** belong to **Customers**.
- **Sales Orders** contain items referencing **Products**.
- **Invoices** are generated from **Sales Orders** (One-to-One or Many-to-One depending on impl, currently One-to-One in schema).

## API Endpoints List

### Authentication
- `POST /api/auth/login`: Authenticate user and return JWT + Refresh Token.
- `POST /api/auth/refresh`: Refresh access token.
- `GET /api/auth/me`: Get current user details and permissions.

### Products
- `GET /api/products`: List products with pagination & filtering.
- `GET /api/products/:id`: Get product details.
- `POST /api/products`: Create a new product.
- `PUT /api/products/:id`: Update product details.
- `DELETE /api/products/:id`: Soft delete a product.

### Stock
- `GET /api/stock`: Get current stock levels (via `stock_current` view).
- `POST /api/stock/adjust`: Manually adjust stock (creates a movement).
- `POST /api/stock/transfer`: Transfer stock between warehouses.
- `GET /api/stock/movements`: Audit trail of stock changes.

### Sales Orders
- `POST /api/orders`: Create a sales order (status: DRAFT).
- `GET /api/orders`: List sales orders.
- `POST /api/orders/:id/approve`: Approve order (Triggers transactions: Allocation/Stock deduction if applicable).
- `POST /api/orders/:id/ship`: Mark as shipped.

### Purchase Orders
- `POST /api/purchases`: Create purchase order.
- `POST /api/purchases/:id/receive`: Receive items (updates stock via `stock_movements`).

### Reports
- `GET /api/reports/dashboard`: Aggregate data for dashboard.
- `GET /api/reports/sales`: Sales reports over time.
