-- USERS TABLE (Stores user accounts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCTS TABLE (Stores product details)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ORDERS TABLE (Tracks user orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_price DECIMAL(10, 2) NOT NULL,
    number_of_items_bought INT NOT NULL DEFAULT 0,
    delivery_type VARCHAR(50) NOT NULL, -- e.g., PSV, Outside Nairobi, Express Delivery
    delivery_stage_id UUID REFERENCES psv_stages(id) ON DELETE SET NULL, -- If applicable
    delivery_location TEXT,
    store_address TEXT,
    county VARCHAR(100),
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    order_status VARCHAR(20) DEFAULT 'pending', -- Changes to 'completed' after checkout
    created_at TIMESTAMP DEFAULT NOW()
);

-- ORDER ITEMS TABLE (Stores products associated with each order)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE, -- Links to orders
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED, -- Auto calculates subtotal
    created_at TIMESTAMP DEFAULT NOW()
);

-- TRANSACTIONS TABLE (Stores only successful payments)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE, -- Ensures 1 transaction per order
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL, -- e.g., M-Pesa, Credit Card, PayPal
    transaction_ref VARCHAR(255) UNIQUE NOT NULL, -- External payment reference
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'success', -- Only successful transactions are recorded
    created_at TIMESTAMP DEFAULT NOW()
);

-- PSV STAGES TABLE (Stores delivery stage details for PSV delivery)
CREATE TABLE psv_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL
);

-- CART TABLE (Temporary storage for unchecked out orders)
CREATE TABLE cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCT LIKES TABLE (Tracks users who liked a product)
CREATE TABLE product_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, product_id) -- Ensures a user can like a product only once
);

CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5), -- Rating from 1 to 5
    review TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(500),  -- Stores the URL of the uploaded image
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
