-- 1. Insert standard ERP roles (idempotent)
INSERT INTO roles (name) 
VALUES 
    ('Super Admin'),
    ('System Admin'),
    ('Admin'),
    ('Reporter'),
    ('User')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert standard ERP permissions
INSERT INTO permissions (code, description)
VALUES 
    ('USERS_VIEW', 'View all users'),
    ('USERS_MANAGE', 'Create, update, and toggle users'),
    ('ROLES_VIEW', 'View roles and their permissions'),
    ('ROLES_MANAGE', 'Modify roles and permission mappings'),
    ('PRODUCTS_VIEW', 'View product catalog'),
    ('PRODUCTS_MANAGE', 'Manage product data and pricing'),
    ('STOCK_VIEW', 'View inventory levels'),
    ('STOCK_MANAGE', 'Adjust and transfer stock'),
    ('ORDERS_VIEW', 'View sales orders'),
    ('ORDERS_MANAGE', 'Create and modify sales orders'),
    ('ORDERS_APPROVE', 'Approve sales orders for shipping'),
    ('PURCHASES_VIEW', 'View purchase orders'),
    ('PURCHASES_MANAGE', 'Manage procurement'),
    ('AUDIT_VIEW', 'View system audit logs'),
    ('REPORTS_VIEW', 'Access dashboard and analytics reports')
ON CONFLICT (code) DO NOTHING;

-- 3. Link Permissions to Roles (Idempotent Mapping)
DO $$
DECLARE
    role_id_var INT;
BEGIN
    -- --- SUPER ADMIN: All permissions ---
    SELECT id INTO role_id_var FROM roles WHERE name = 'Super Admin';
    IF role_id_var IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT role_id_var, id FROM permissions
        ON CONFLICT DO NOTHING;
    END IF;

    -- --- SYSTEM ADMIN: Technical & Core Management ---
    SELECT id INTO role_id_var FROM roles WHERE name = 'System Admin';
    IF role_id_var IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT role_id_var, id FROM permissions 
        WHERE code IN ('USERS_VIEW', 'USERS_MANAGE', 'ROLES_VIEW', 'PRODUCTS_VIEW', 'PRODUCTS_MANAGE', 'STOCK_VIEW', 'AUDIT_VIEW', 'REPORTS_VIEW')
        ON CONFLICT DO NOTHING;
    END IF;

    -- --- ADMIN: Operational Management ---
    SELECT id INTO role_id_var FROM roles WHERE name = 'Admin';
    IF role_id_var IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT role_id_var, id FROM permissions 
        WHERE code IN ('PRODUCTS_VIEW', 'PRODUCTS_MANAGE', 'STOCK_VIEW', 'STOCK_MANAGE', 'ORDERS_VIEW', 'ORDERS_MANAGE', 'ORDERS_APPROVE', 'PURCHASES_VIEW')
        ON CONFLICT DO NOTHING;
    END IF;

    -- --- REPORTER: Read-only access ---
    SELECT id INTO role_id_var FROM roles WHERE name = 'Reporter';
    IF role_id_var IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT role_id_var, id FROM permissions 
        WHERE code LIKE '%_VIEW'
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- 4. Assign 'Super Admin' role to admin@example.com (if exists)
DO $$
DECLARE 
    v_user_id UUID;
    v_role_id INT;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE email = 'admin@example.com';
    SELECT id INTO v_role_id FROM roles WHERE name = 'Super Admin';

    IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id)
        VALUES (v_user_id, v_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
END $$;
