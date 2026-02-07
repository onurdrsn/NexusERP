export type OrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'REJECTED';

export interface OrderItem {
    product_id: string;
    quantity: number;
    unit_price: number;
}

export interface Order {
    id: string;
    customer_id?: string;
    customer_name: string;
    status: OrderStatus;
    total_amount: number;
    created_at: string;
    items: OrderItem[];
}

export interface Customer {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    initial_stock?: number;
    min_stock?: number;
    unit?: string;
    is_active: boolean;
}

export interface StockItem {
    id: string; // usually product_id
    product_id: string;
    product_name: string;
    sku: string;
    total_stock: number;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockMovement {
    id: string;
    product_id?: string;
    product_name: string;
    type: StockMovementType;
    quantity: number;
    reason: string;
    created_at: string;
    created_by: string;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export interface Role {
    id: string;
    name: string;
    permissions: string[];
}

export interface AuditLog {
    id: string;
    user_id?: string;
    user_email: string;
    action: string;
    details: any;
    created_at: string;
}

export interface Warehouse {
    id: string;
    name: string;
    location?: string;
    capacity?: number;
}
