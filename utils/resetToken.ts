import crypto from 'node:crypto'

export const generateOTP = function() {
    const otpToken = crypto.randomInt(10000, 99999);
    const passwordResetToken = crypto.createHash('sha256').update(otpToken.toString()).digest('hex');

    // Format as "YYYY-MM-DD HH:MM:SS" (without timezone)
    const passwordExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .split(".")[0];

    return { otpToken, passwordExpiresAt, passwordResetToken };
};