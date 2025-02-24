import { Queue, QueueEvents } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

export const redisConnection = {
    port: 6379, 
    host: process.env.REDIS_LOCALHOST, 
    username: "default", 
    password: process.env.REDIS_PASSWORD,
    db: 0, 
  }

// Export the email queue
export const emailQueue = new Queue('email', { connection: redisConnection });
export const paymentQueue = new Queue('payments', { connection: redisConnection })
export const paymentQueueEvents = new QueueEvents('payments', { connection: redisConnection });