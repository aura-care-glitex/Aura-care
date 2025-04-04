import crypto from "crypto";

export const generateOrderFingerprint = ( userId: any, cartItems: any[], deliveryDetails: any ) => {
    const hashData = {
        userId,
        cartItems: cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        })).sort((a, b) => a.product_id.localeCompare(b.product_id)),
        ...deliveryDetails
    };
    const str = JSON.stringify(hashData);
    return crypto.createHash("sha256").update(str).digest("hex");
};