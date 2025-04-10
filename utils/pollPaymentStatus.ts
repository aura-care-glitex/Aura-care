import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

export const pollPaymentStatus = async (referenceId: string) => {
    let status = 'pending';
    let maxRetries = 5; // how many times you want to check
    let retries = 0;

    while (status === 'pending' && retries < maxRetries) {
        try {
            const response = await axios.get(`https://api.paystack.co/transaction/verify/${referenceId}`, {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET as string}`
                }
            });

            const paymentStatus = response.data.data.status;

            console.log(`Attempt ${retries + 1}: Payment status is ${paymentStatus}`);

            if (paymentStatus === 'success') {
                status = 'success';
                break;
            } else if (paymentStatus === 'failed' || paymentStatus === 'abandoned') {
                status = 'failed';
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 sec before retrying
            retries++;

        } catch (error) {
            console.error('Error checking payment status:', error);
            break;
        }
    }

    return status;
}
