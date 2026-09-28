import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "support@khakigemstone.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Responsive Professional Investor Template
 */
const investorApprovedTemplate = ({ firstName, loginUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Investor Approval</title>
  <style>
    /* Mobile Styles */
    @media screen and (max-width: 600px) {
      .content-wrapper {
        padding: 20px !important;
      }
      .container {
        width: 100% !important;
        border-radius: 0 !important;
      }
      .button {
        display: block !important;
        text-align: center !important;
        width: auto !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 40px 10px;" class="content-wrapper">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          <tr>
            <td style="background-color: #CA0C7F; height: 6px; line-height: 6px; font-size: 1px;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding: 40px; text-align: left;">
              <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-family: Arial, sans-serif; font-size: 24px; font-weight: 600; line-height: 30px;">
                Account Activation Confirmed
              </h1>
              
              <p style="margin: 0 0 15px 0; color: #4a4a4a; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px;">
                Dear ${firstName},
              </p>
              
              <p style="margin: 0 0 15px 0; color: #4a4a4a; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px;">
                We are pleased to inform you that your <strong>Investor Application</strong> for Khaki Gemstone has been formally reviewed and approved.
              </p>

              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px;">
                Your account is now fully active, providing you with immediate access to our exclusive portfolio of investment opportunities.
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" bgcolor="#1a1a1a" style="border-radius: 4px;">
                    <a href="${loginUrl}" target="_blank" class="button" style="padding: 16px 32px; font-family: Arial, sans-serif; font-size: 14px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block; letter-spacing: 1px; border: 1px solid #1a1a1a; border-radius: 4px;">
                      ACCESS INVESTOR PORTAL
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border: 0; border-top: 1px solid #eaeaeb; margin: 30px 0;">

              <p style="margin: 0 0 5px 0; color: #1a1a1a; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600;">
                Best regards,
              </p>
              <p style="margin: 0; color: #7a7a7a; font-family: Arial, sans-serif; font-size: 14px;">
                The Khaki Gemstone Team
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9fb; text-align: center;">
              <p style="margin: 0; color: #b0adc5; font-family: Arial, sans-serif; font-size: 12px; line-height: 18px;">
                © 2026 Khaki Gemstone. All rights reserved. <br>
                This is a confidential communication intended solely for the addressee.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const sendInvestorApprovedEmail = async ({ to, firstName }) => {
  const loginUrl = process.env.INVESTOR_LOGIN_URL;

  await transporter.sendMail({
    from: `"Khaki Gemstone" <support@khakigemstone.com>`,
    to,
    subject: "Investor Account Approval – Khaki Gemstone",
    html: investorApprovedTemplate({ firstName, loginUrl }),
  });
};

export default transporter;