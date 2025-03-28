// single order module
interface User {
  id: string;
  username: string;
  phonenumber: string;
  email: string;
}

interface Product {
  stock_quantity: number;
}

interface Order {
  total_price: number;
  delivery_type: string;
  delivery_location: string;
  user_id: string;
  users: User;
}

interface OrderItem {
  product_name: any;
  stock_quantity: any;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  orders: Order;
  product: {
    stock_quantity: number
  }
}

export default OrderItem