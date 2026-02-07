-- Admin user creation using CTE (Common Table Expression)
-- This method works in most SQL query editors including Neon Console

WITH new_user AS (
  INSERT INTO users (email, password_hash, full_name, is_active)
  VALUES (
    'admin@example.com',
    '$2b$10$ZHq6thakNHUHjIamvO/OcOMyqEdUvOaTsMliUrlreJMgqLCAoDZsS', -- 'admin123'
    'System Admin',
    true
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id
),
admin_role AS (
  SELECT id FROM roles WHERE name = 'admin'
)
INSERT INTO user_roles (user_id, role_id)
SELECT new_user.id, admin_role.id
FROM new_user, admin_role;
