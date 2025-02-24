# Aura-Care E-Commerce API

Aura-Care is a robust e-commerce API built using **Node.js**, **Express**, and **PostgreSQL** with **Supabase** as the database. It supports user authentication, product management, order processing, and payment handling.

## 🚀 Features
- **User Authentication & Authorization** (JWT-based authentication, role-based access control)
- **Product Management** (CRUD operations for products)
- **Reviews & Ratings** (Users can review products)
- **Secure Payments** (Integrated with Paystack)
- **Caching with Redis** (Faster product retrieval)
- **Soft Delete Users** (Deactivating users instead of removing them permanently)
- **Image Uploads** (Multer for product images)

---
## 📌 Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Getange/aura-care.git
   cd aura-care
   ```

2. Install dependencies:
   ```sh
   pnpm install  # Or use npm install
   ```

3. Set up **.env** file:
   ```sh
   PORT=8040
   DATABASE_URL=your_database_url
   JWT_SECRET=your_jwt_secret
   PAYSTACK_SECRET_KEY=your_paystack_secret
   REDIS_URL=your_redis_url
   ```

4. Start the development server:
   ```sh
   pnpm run dev  # Or npm run dev
   ```

The API will run on `http://localhost:8040`.

---
## 📡 API Endpoints

### 🔐 User Routes (`/api/v1/users`)
| Method | Endpoint            | Description                         | Auth |
|--------|---------------------|-------------------------------------|------|
| POST   | `/register`         | Register a new user                | ✅   |
| POST   | `/login`            | Authenticate user & return token   | ✅   |
| PATCH  | `/updateProfile`    | Update user profile                | ✅   |
| PATCH  | `/softDelete`       | Deactivate user account            | ✅   |
| GET    | `/:id`              | Get a single user                  | ✅   |
| GET    | `/`                 | Get all users (Admin only)         | ✅   |

### 🛒 Product Routes (`/api/v1/product`)
| Method | Endpoint              | Description                      | Auth |
|--------|----------------------|----------------------------------|------|
| GET    | `/`                  | Get all products                 | ✅   |
| POST   | `/`                  | Create a new product (Admin)     | ✅   |
| GET    | `/:productId`        | Get a single product             | ✅   |
| PATCH  | `/:productId`        | Update product (Admin)           | ✅   |
| DELETE | `/:productId`        | Delete product (Admin)           | ✅   |
| PATCH  | `/image/:productId`  | Upload product image (Admin)     | ✅   |

### ⭐ Review Routes (`/api/v1/review`)
| Method | Endpoint            | Description                      | Auth |
|--------|---------------------|----------------------------------|------|
| GET    | `/`                 | Get all reviews                  | ✅   |
| POST   | `/`                 | Create a review (Authenticated)  | ✅   |
| PATCH  | `/:reviewId`        | Update a review (Owner/Admin)    | ✅   |
| DELETE | `/:reviewId`        | Delete a review (Owner/Admin)    | ✅   |

### 💰 Payment Routes (`/api/v1/payment`)
| Method | Endpoint                         | Description                           | Auth |
|--------|----------------------------------|---------------------------------------|------|
| POST   | `/paystack/pay`                 | Initialize payment (Authenticated)   | ✅   |
| GET    | `/paystack/pay`                 | Get all transactions (Admin)         | ✅   |
| GET    | `/paystack/verify/:referenceId` | Verify a transaction (Admin)         | ✅   |
| GET    | `/paystack/:transactionId`      | Get a single transaction (Admin)     | ✅   |
| POST   | `/paystack/payment/webhook`     | Handle Paystack webhook              | ✅   |

---
## 📌 Technologies Used
- **Node.js** + **Express.js** (Backend framework)
- **Supabase (PostgreSQL)** (Database)
- **Redis** (Caching)
- **Multer** (File uploads)
- **JWT** (Authentication)
- **Paystack API** (Payment processing)



---
## 👨‍💻 Contributing
1. Fork the repository.
2. Create a new branch (`feature/new-feature`).
3. Commit your changes and push.
4. Open a **pull request**.

---
## 📜 License
This project is licensed under the **MIT License**.

---
### 📞 Contact
For inquiries or collaboration:
- Email: emmanuelgetange48@gmail.com
- GitHub: [@Getange](https://github.com/Getange)

---
**Happy Coding! 🚀**

