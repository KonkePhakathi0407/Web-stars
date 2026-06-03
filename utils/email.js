const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }

});
transporter.verify(function(error, success) {
    if (error) {
        console.log("EMAIL ERROR:", error);
    } else {
        console.log("Email server is ready");
    }
});
// ── Shared HTML email wrapper ─────────────────────────────────────────────────
function buildEmailHtml({ heading, subheading, bodyHtml }) {
    return `
    <!DOCTYPE html><html><head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
        .header { background: #5b3ec8; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background: #f5f5fa; border-radius: 0 0 8px 8px; }
        .otp-code {
            font-size: 32px; font-weight: bold; text-align: center;
            padding: 20px; background: white; border-radius: 10px;
            letter-spacing: 5px; font-family: monospace; margin: 16px 0;
        }
        .warning { color: #c8002b; font-size: 12px; margin-top: 15px; }
        .footer { font-size: 12px; color: #888; text-align: center; margin-top: 20px; }
    </style>
    </head><body>
    <div class="container">
        <div class="header">
            <h2>MindCare Hub</h2>
            <p>${subheading}</p>
        </div>
        <div class="content">
            ${bodyHtml}
            <hr>
            <p class="warning">NEVER share this code with anyone, including MindCare Hub support staff.</p>
        </div>
        <div class="footer"><p>&copy; 2026 MindCare Hub. All rights reserved.</p></div>
    </div>
    </body></html>`;
}

// ── Send email verification code (signup) ─────────────────────────────────────
async function sendVerificationCode(email, code) {
   console.log("EMAIL ATTEMPT →", email, code);
    const mailOptions = {
        from: `"MindCare Hub" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your MindCare Hub account',
        html: buildEmailHtml({
            subheading: 'Account Verification',
            bodyHtml: `
                <p>Hi there,</p>
                <p>Thanks for signing up! Use the code below to verify your email address. It expires in <strong>2 minutes</strong>.</p>
                <div class="otp-code">${code}</div>
                <p>If you did not create an account, you can safely ignore this email.</p>
            `
        })
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Verification email error:', error);
        console.log("EMAIL ATTEMPT →", email, code);
        return false;
    }
}

// ── Send OTP for password change ──────────────────────────────────────────────
async function sendPasswordChangeOTP(email, otpCode, userName) {
    const mailOptions = {
        from: `"MindCare Hub Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Change Verification Code - MindCare Hub',
        html: buildEmailHtml({
            subheading: 'Password Change Verification',
            bodyHtml: `
                <p>Hello ${userName || 'User'},</p>
                <p>We received a request to change your password. Use the code below to complete the process. It expires in <strong>10 minutes</strong>.</p>
                <div class="otp-code">${otpCode}</div>
                <p>If you did not request a password change, please ignore this email.</p>
            `
        })
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Password OTP email error:', error);
        return false;
    }
}

module.exports = { sendVerificationCode, sendPasswordChangeOTP };