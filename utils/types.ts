export interface User {
  id: string;  // UUID format
  username: string;
  phonenumber: string;
  email?: string;  // Optional email field
}

export interface OrderedItem {
  product_id: string;  // UUID format for product IDs
  quantity: number;
  unit_price: number;  // Price per unit
  total_price: number;  // Computed: quantity * unit_price
  stock_quantity?: number;  // Optional stock tracking
  product_name?: string;  // Optional product name
}

export interface Order {
  county: string;
  store_address: string;
  tracking_status: any;
  order_items: any;
  delivery_fee: number;
  id: string;  // UUID format for order IDs
  total_price: number;
  shipping_fee: number;
  grand_total: number;  // Computed: total_price + shipping_fee
  created_at: string;
  delivery_location: string | null;
  delivery_type?: string;  // Optional delivery type
  users: User | null;  // Can be null if user data is missing
  ordered_items: OrderedItem[];
  order_id: string,
  user: string,
  products : any
}

export default Order;
