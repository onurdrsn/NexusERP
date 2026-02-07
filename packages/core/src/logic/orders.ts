import type { Order, OrderItem, OrderStatus } from '../types';

export const calculateOrderTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

export const canApproveOrder = (orderStatus: OrderStatus): boolean => {
    return orderStatus === 'DRAFT' || orderStatus === 'PENDING_APPROVAL';
};

export const validateOrderForApproval = (order: Order): void => {
    if (!canApproveOrder(order.status)) {
        throw new Error(`Order must be in DRAFT or PENDING_APPROVAL status to be approved. Current status: ${order.status}`);
    }
    if (!order.items || order.items.length === 0) {
        throw new Error('Order must have items to be approved.');
    }
};

export const validateOrder = (orderData: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!orderData.customer_id) errors.push('Customer ID is required');
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        errors.push('Order must contain at least one item');
    } else {
        orderData.items.forEach((item: any, index: number) => {
            if (!item.product_id) errors.push(`Item ${index}: Product ID is required`);
            if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index}: Quantity must be positive`);
            if (item.unit_price === undefined || item.unit_price < 0) errors.push(`Item ${index}: Unit price must be non-negative`);
        });
    }
    return { isValid: errors.length === 0, errors };
};

export const validateOrderStateTransition = (current: OrderStatus, next: OrderStatus): boolean => {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
        'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'CANCELLED'],
        'APPROVED': ['PROCESSING', 'CANCELLED'],
        'PROCESSING': ['SHIPPED', 'CANCELLED'],
        'SHIPPED': ['DELIVERED', 'RETURNED'],
        'DELIVERED': ['COMPLETED'],
        'COMPLETED': [],
        'CANCELLED': [],
        'REJECTED': ['DRAFT'],
        'RETURNED': []
    };
    return validTransitions[current]?.includes(next) ?? false;
};
