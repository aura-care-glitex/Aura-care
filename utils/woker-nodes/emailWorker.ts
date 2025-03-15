import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { sendMail } from '../email';

dotenv.config();

const redisConnection = {
  port: 6379, 
  host: process.env.REDIS_LOCALHOST, 
  username: "default", 
  password: process.env.REDIS_PASSWORD,
  db: 0, 
}

// Create a worker to process email jobs
export const emailWorker = new Worker('email', async (job) => {

  const { email, subject, from, name, message, otp } = job.data;

  try {
    await sendMail({ email, subject, from, name, message, otp});

    console.log(`Email successfully sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
}, { 
  connection: redisConnection, 
  removeOnComplete : { count: 1000 },
  removeOnFail: { count: 5000 }
});