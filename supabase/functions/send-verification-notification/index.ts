import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "mykolb1@icloud.com";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "notifications@rentaloo.com";

interface VerificationNotificationPayload {
  userId: string;
  userName: string;
  userEmail: string;
  documentType: string;
  documentUrl?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify Resend API key is configured
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Parse request body
    const payload: VerificationNotificationPayload = await req.json();
    const { userId, userName, userEmail, documentType, documentUrl } = payload;

    // Validate required fields
    if (!userId || !userName || !userEmail || !documentType) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: userId, userName, userEmail, documentType",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare email content
    const emailSubject = `New Verification Document Uploaded - ${userName}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verification Document Uploaded</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Verification Document</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              A user has uploaded a new verification document for review.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea; font-size: 18px;">User Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; width: 140px;">Name:</td>
                  <td style="padding: 8px 0;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Email:</td>
                  <td style="padding: 8px 0;">${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">User ID:</td>
                  <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${userId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Document Type:</td>
                  <td style="padding: 8px 0; text-transform: capitalize;">${documentType}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Upload Time:</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://rentaloo.com"}/admin/verifications?userId=${userId}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                Review Verification →
              </a>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
              <p style="margin: 5px 0;">This is an automated notification from RentAloo.</p>
              <p style="margin: 5px 0;">Please review and process this verification request promptly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Verification Document Uploaded

User Details:
- Name: ${userName}
- Email: ${userEmail}
- User ID: ${userId}
- Document Type: ${documentType}
- Upload Time: ${new Date().toLocaleString()}

Review this verification: ${Deno.env.get("SITE_URL") || "https://rentaloo.com"}/admin/verifications?userId=${userId}

This is an automated notification from RentAloo.
    `.trim();

    // Send email via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL.split(",").map((email) => email.trim()),
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", responseData);
      throw new Error(
        `Failed to send email: ${responseData.message || "Unknown error"}`
      );
    }

    console.log("Email sent successfully:", responseData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification email sent successfully",
        emailId: responseData.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-verification-notification:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send notification",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
