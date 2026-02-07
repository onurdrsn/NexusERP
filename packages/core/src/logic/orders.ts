import type { Order, OrderItem, OrderStatus } from '../types';

export const calculateOrderTotal = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
};

export const canApproveOrder = (orderStatus: OrderStatus): boolean => {
    return orderStatus === 'DRAFT';
};

export const validateOrderForApproval = (order: Order): void => {
    if (!canApproveOrder(order.status)) {
        throw new Error(`Order must be in DRAFT status to be approved. Current status: ${order.status}`);
    }
    if (!order.items || order.items.length === 0) {
        throw new Error('Order must have items to be approved.');
    }
};
