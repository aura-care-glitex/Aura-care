import { Job, Worker } from 'bullmq';
import dotenv from 'dotenv';
import axios from 'axios';
import redis from '../../middlewares/redisConfig';

dotenv.config();

const redisConnection = {
  port: 6379, 
  host: process.env.REDIS_LOCALHOST, 
  username: "default", 
  password: process.env.REDIS_PASSWORD,
  db: 0, 
}

// create a worker to process payments
export const paymentWorker = new Worker('payments', async function(job:Job){
    console.log(`Processing payments for user: ${job.data.user.email}`);

    const  { user, amount, idempotencyKey } = job.data;

     try {
        // convert the amount to cents(paystack)
        const paystackAmount = amount * 100;

        const payload = {
            email: user.email,
            amount: paystackAmount,
            currency: "KES",
            channels: ["card","mobile_money"],
            metadata: {
                email: user.email
            }
        }

        const response =await axios.post(process.env.PAYSTACK_INITIALIZE_URL as string, payload, {
            headers:{
                Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET as string}`,
                "Content-Type": "application/json"
            }
        })

        console.log(response.data)

        return response.data;

     } catch (error:any) {
        console.error(`Payment processing failed:`, error.message)

        // remove idempotency key on failure to allow retry
        await redis.del(idempotencyKey)

        throw error;
     }
}, { 
    connection: redisConnection, 
    removeOnComplete : { count: 1000 },
    removeOnFail: { count: 5000}
})