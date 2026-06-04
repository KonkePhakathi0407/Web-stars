const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: 'ad5b44001@smtp-brevo.com',
        pass: '1WmcvFEtxOzMpyn2'
    }
});

async function sendVerificationCode(email, code) {
    try {
        console.log('SENDING OTP TO:', email);
        await transporter.sendMail({
            from: '"MindCare Hub" <mindchub@gmail.com>',
            to: email,
            subject: 'MindCare Hub — Email Verification Code',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
                    <div style="background:#5b3ec8;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                        <h2>MindCare Hub</h2>
                        <p>Account Verification</p>
                    </div>
                    <div style="padding:20px;background:#f5f5fa;border-radius:0 0 8px 8px;">
                        <p>Hi there,</p>
                        <p>Thanks for signing up! Use the code below to verify your email. It expires in <strong>2 minutes</strong>.</p>
                        <div style="font-size:32px;font-weight:bold;text-align:center;padding:20px;background:white;border-radius:10px;letter-spacing:5px;font-family:monospace;margin:16px 0;">${code}</div>
                        <p>If you did not create an account, ignore this email.</p>
                    </div>
                </div>
            `
        });
        console.log('OTP sent successfully to:', email);
        return true;
    } catch (error) {
        console.error('Verification email error:', error);
        return false;
    }
}

async function sendPasswordChangeOTP(email, otpCode, userName) {
    try {
        console.log('SENDING PASSWORD OTP TO:', email);
        await transporter.sendMail({
            from: '"MindCare Hub Security" <mindchub@gmail.com>',
            to: email,
            subject: 'Password Change Verification Code - MindCare Hub',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
                    <div style="background:#5b3ec8;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                        <h2>MindCare Hub</h2>
                        <p>Password Change Verification</p>
                    </div>
                    <div style="padding:20px;background:#f5f5fa;border-radius:0 0 8px 8px;">
                        <p>Hello ${userName || 'User'},</p>
                        <p>Use the code below to change your password. It expires in <strong>10 minutes</strong>.</p>
                        <div style="font-size:32px;font-weight:bold;text-align:center;padding:20px;background:white;border-radius:10px;letter-spacing:5px;font-family:monospace;margin:16px 0;">${otpCode}</div>
                        <p>If you did not request this, ignore this email.</p>
                    </div>
                </div>
            `
        });
        console.log('Password OTP sent successfully to:', email);
        return true;
    } catch (error) {
        console.error('Password OTP email error:', error);
        return false;
    }
}

module.exports = { sendVerificationCode, sendPasswordChangeOTP };
