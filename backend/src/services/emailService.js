const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
    const port = parseInt(process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.BREVO_SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      console.log(`[EmailService] Configured SMTP relay (${host}:${port})`);
    } else {
      console.warn('[EmailService] SMTP credentials not configured. OTPs will be logged to terminal in development mode.');
    }
  }

  async sendVerificationOtp(email, otp) {
    const from = process.env.EMAIL_FROM || 'SankshepAI <no-reply@sankshep.ai>';
    const subject = `Your SankshepAI Verification Code: ${otp}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px; border-radius: 12px; max-width: 500px; margin: auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 28px; letter-spacing: -0.5px;">SankshepAI</h1>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">AI-Powered Document Summarization & Intelligence</p>
        </div>
        <div style="background-color: #161f30; padding: 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
          <p style="font-size: 15px; line-height: 1.6; color: #d1d5db;">Please use the one-time verification code below to verify your account. This code is valid for <strong>10 minutes</strong>.</p>
          <div style="margin: 28px 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #22d3ee; background: #0e1526; padding: 16px; border-radius: 8px; border: 1px dashed #6366f1;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #9ca3af; margin: 0;">If you did not initiate this request, please disregard this email.</p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px;">
          &copy; ${new Date().getFullYear()} SankshepAI Platform. All rights reserved.
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to: email, subject, html });
        console.log(`[EmailService] OTP email successfully delivered to ${email}`);
        return { success: true, simulated: false };
      } catch (err) {
        console.error('[EmailService] Failed to send email via SMTP:', err.message);
        if (err.message && err.message.includes('525')) {
          console.warn('[EmailService Diagnostic] Brevo rejected connection with: 525 5.7.1 Unauthorized IP address.');
          console.warn('[EmailService Diagnostic] To deliver real emails, go to Brevo > Settings > Security > Authorized IPs and authorize your server IP or deactivate IP restrictions.');
        }
        // Fallback log
        console.log(`\n==================================================`);
        console.log(`[DEV OTP FALLBACK] Verification code for ${email}: ${otp}`);
        console.log(`==================================================\n`);
        return { success: true, simulated: true, error: err.message };
      }
    } else {
      console.log(`\n==================================================`);
      console.log(`[DEV OTP LOG] Verification code for ${email}: ${otp}`);
      console.log(`==================================================\n`);
      return { success: true, simulated: true };
    }
  }

  async sendPasswordResetOtp(email, otp) {
    const from = process.env.EMAIL_FROM || 'SankshepAI Security <security@sankshep.ai>';
    const subject = `Your SankshepAI Password Reset Code: ${otp}`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px; border-radius: 12px; max-width: 500px; margin: auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #6366f1; margin: 0; font-size: 28px;">SankshepAI</h1>
          <p style="color: #9ca3af; font-size: 14px;">Password Reset Request</p>
        </div>
        <div style="background-color: #161f30; padding: 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
          <p style="font-size: 15px; color: #d1d5db;">We received a request to reset your password. Use the code below to complete your reset. Valid for <strong>15 minutes</strong>.</p>
          <div style="margin: 28px 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f43f5e; background: #0e1526; padding: 16px; border-radius: 8px; border: 1px dashed #f43f5e;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #9ca3af;">If you did not request a password reset, no further action is required.</p>
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to: email, subject, html });
        return { success: true };
      } catch (err) {
        console.log(`\n==================================================`);
        console.log(`[DEV RESET OTP FALLBACK] Reset code for ${email}: ${otp}`);
        console.log(`==================================================\n`);
        return { success: true, simulated: true };
      }
    } else {
      console.log(`\n==================================================`);
      console.log(`[DEV RESET OTP LOG] Reset code for ${email}: ${otp}`);
      console.log(`==================================================\n`);
      return { success: true, simulated: true };
    }
  }
}

module.exports = new EmailService();
