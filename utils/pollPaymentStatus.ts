import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

export const pollPaymentStatus = async (referenceId: string) => {
    let status = 'pending';
    const maxRetries = 10; // Increased retries
    const initialDelay = 15000; // 15 seconds before first check
    let retries = 0;

    // Add initial delay to account for payment processing time
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    while (status === 'pending' && retries < maxRetries) {
        try {
            const response = await axios.get(
                `https://api.paystack.co/transaction/verify/${referenceId}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET}`
                    },
                    timeout: 5000 // Add timeout for requests
                }
            );

            const paymentStatus = response.data.data?.status || 'pending';

            console.log(`Attempt ${retries + 1}: Status ${paymentStatus}`);

            if (paymentStatus === 'success') {
                return 'success';
            }
            
            if (['failed', 'abandoned', 'reversed'].includes(paymentStatus)) {
                return 'failed';
            }

            // Progressive backoff: 3s, 5s, 8s, etc.
            const delay = Math.min(3000 + (retries * 2000), 15000);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries++;

        } catch (error) {
            console.error('Payment check error:', error);
            // Implement error-specific handling
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return 'invalid_reference';
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            retries++;
        }
    }

    return status === 'pending' ? 'timeout' : status;
};