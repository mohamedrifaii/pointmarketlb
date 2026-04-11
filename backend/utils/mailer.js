const nodemailer = require('nodemailer');

let transporterPromise;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      }

      return nodemailer.createTransport({
        jsonTransport: true,
      });
    })();
  }

  return transporterPromise;
}

async function sendVerificationEmail({ email, code, name }) {
  const transporter = await getTransporter();
  const from = process.env.EMAIL_FROM || 'PointMarketLB <no-reply@pointmarketlb.local>';
  const appName = process.env.STORE_NAME || 'PointMarketLB';

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: `${appName} verification code`,
    text: `Hello ${name}, your verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #f7f1e8; color: #1d2a24;">
        <h2 style="margin-top: 0;">Verify your email</h2>
        <p>Hello ${name},</p>
        <p>Use the code below to finish creating your ${appName} account.</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 20px; background: #ffffff; border-radius: 12px; display: inline-block;">
          ${code}
        </div>
        <p style="margin-top: 18px;">This code expires in 10 minutes.</p>
      </div>
    `,
  });

  return info;
}

module.exports = {
  sendVerificationEmail,
};
