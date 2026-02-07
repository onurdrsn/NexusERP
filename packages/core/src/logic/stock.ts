export const hasSufficientStock = (currentStock: number, requiredQuantity: number): boolean => {
    return currentStock >= requiredQuantity;
};

export const validateStockForAllocation = (currentStock: number, requiredQuantity: number, productId: string): void => {
    if (!hasSufficientStock(currentStock, requiredQuantity)) {
        throw new Error(`Insufficient stock for product ${productId}. Required: ${requiredQuantity}, Available: ${currentStock}`);
    }
};

export const calculateNewStockLevel = (currentStock: number, change: number): number => {
    return currentStock + change;
};
