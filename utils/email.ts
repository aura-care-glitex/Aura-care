import nodemailer from 'nodemailer';
import AppError from './AppError';
import dotenv from 'dotenv'

dotenv.config();

// Options for the sendMail function
type Options = {
    from: any;
    email: string;
    subject: string;
    name: string; 
    message: string;
    otp?:any
};

// Email template generator
const emailTemplate = (name: string, message: string, otp?: number) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aura-care Beauty</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #E3F2FD;">
        <header style="background-color: #1976D2; padding: 20px; text-align: center;">
            <img src="[Your-Logo-URL]" alt="Aura-care Logo" style="max-width: 150px; height: auto;">
            <h1 style="color: #FFFFFF; margin: 10px 0; font-size: 28px;">Aura-care Beauty</h1>
        </header>

        <main style="padding: 30px 25px;">
            <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">Dear <strong>${name}</strong>,</p>
            
            <div style="background-color: #FFFFFF; padding: 25px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <p style="font-size: 15px; line-height: 1.6; color: #555555; margin: 0 0 20px 0;">${message}</p>
                
                ${otp ? `
                <div style="background-color: #BBDEFB; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <p style="font-size: 13px; color: #555555; margin: 0 0 10px 0;">Your verification code:</p>
                    <div style="font-size: 24px; font-weight: bold; color: #0D47A1; letter-spacing: 2px;">${otp}</div>
                    <p style="font-size: 12px; color: #555555; margin: 10px 0 0 0;">This code expires in 10 minutes</p>
                </div>` : ''}
            </div>

            <p style="font-size: 14px; color: #666666; margin: 25px 0 0 0;">
                With love,<br>
                <strong>The Aura-care Team</strong><br>
                <span style="font-size: 12px; color: #999999;">Enhancing Your Natural Beauty</span>
            </p>
        </main>

        <footer style="background-color: #E3F2FD; padding: 20px; text-align: center;">
            <div style="font-size: 12px; color: #666666;">
                <p style="margin: 5px 0;">Follow us on 
                    <a href="[Instagram-URL]" style="color: #1976D2; text-decoration: none;">Instagram</a> | 
                    <a href="[Facebook-URL]" style="color: #1976D2; text-decoration: none;">Facebook</a>
                </p>
                <p style="margin: 5px 0;">123 Beauty Street, Paris, France</p>
                <p style="margin: 5px 0;">© ${
                    new Date(Date.now()).toISOString().replace("T", " ").split(".")[0]
                }Aura-care. All rights reserved</p>
            </div>
        </footer>
    </div>
</body>
</html>
`;

// Function to send an email
export const sendMail = async (options: Options) => {
    try {
        // Configure nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
            user: process.env.MAILTRAP_USER as string,
            pass: process.env.MAILTRAP_PASSWORD as string
            }
        });

        // Mail options
        const mailOptions = {
            from: options.from,
            to: options.email,
            subject: options.subject,
            html: emailTemplate(options.name, options.message, options?.otp),
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);

        // Return success message and info
        return { message: 'Email sent successfully', info };
    } catch (error) {
        return new AppError(`Failed to send email: ${(error as Error).message}`, 500);
    }
};
