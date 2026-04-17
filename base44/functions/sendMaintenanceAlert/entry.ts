import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ADMIN_EMAIL = "chris@jetglowaviation.com";
const SCHEDULE_LINK = "https://jetglowaviation.com"; // Update to actual scheduling link if needed

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    if (!data || !data.aircraft_id) {
      return Response.json({ error: "Missing aircraft_id in payload" }, { status: 400 });
    }

    // Fetch aircraft details
    const aircraft = await base44.asServiceRole.entities.Aircraft.get(data.aircraft_id);
    if (!aircraft) {
      return Response.json({ error: "Aircraft not found" }, { status: 404 });
    }

    // Fetch customer if linked
    let customerEmail = null;
    let customerName = null;
    if (aircraft.customer_id) {
      const customer = await base44.asServiceRole.entities.Customer.get(aircraft.customer_id);
      if (customer) {
        customerEmail = customer.email;
        customerName = customer.name;
      }
    }

    const statusLabel = data.service_status; // "Amber" or "Red"
    const urgency = statusLabel === "Red" ? "OVERDUE" : "DUE SOON";
    const urgencyColor = statusLabel === "Red" ? "#dc2626" : "#d97706";

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: #111; padding: 24px 32px;">
            <h1 style="color: #c9a84c; margin: 0; font-size: 22px; letter-spacing: 2px;">JETGLOW AVIATION</h1>
            <p style="color: #888; margin: 4px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">ORBIT Maintenance Alert</p>
          </div>

          <!-- Status Banner -->
          <div style="background: ${urgencyColor}; padding: 12px 32px;">
            <p style="color: white; margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
              ⚠️ Service ${urgency} — ${data.service_name}
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Dear ${customerName || "Aircraft Owner"},</p>
            <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Your aircraft <strong style="color: #111;">${aircraft.tail_number}</strong> (${aircraft.make || ""} ${aircraft.model || ""}) 
              has a service that is <strong style="color: ${urgencyColor};">${urgency.toLowerCase()}</strong>:
            </p>

            <!-- Service Details Card -->
            <div style="background: #f5f5f5; border-left: 4px solid ${urgencyColor}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Service Required</p>
              <p style="margin: 0 0 4px; font-size: 18px; font-weight: bold; color: #111;">${data.service_name}</p>
              ${data.service_code ? `<p style="margin: 0; font-size: 12px; color: #888;">Code: ${data.service_code}</p>` : ""}
            </div>

            <!-- Metrics -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
              ${data.days_since_last_service ? `
              <div style="flex: 1; background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #111;">${Math.round(data.days_since_last_service)}</p>
                <p style="margin: 0; font-size: 11px; color: #888; text-transform: uppercase;">Days Since Last</p>
              </div>` : ""}
              ${data.applicable_day_interval ? `
              <div style="flex: 1; background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #111;">${Math.round(data.applicable_day_interval)}</p>
                <p style="margin: 0; font-size: 11px; color: #888; text-transform: uppercase;">Day Interval</p>
              </div>` : ""}
              ${data.hours_since_last_service ? `
              <div style="flex: 1; background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #111;">${data.hours_since_last_service.toFixed(1)}</p>
                <p style="margin: 0; font-size: 11px; color: #888; text-transform: uppercase;">Hours Since Last</p>
              </div>` : ""}
            </div>

            <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              To schedule your ORBIT service visit, please contact JetGlow Aviation using the link below. Our team will coordinate a time that works best for you.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${SCHEDULE_LINK}" 
                 style="display: inline-block; background: #c9a84c; color: #111; text-decoration: none; font-weight: bold; padding: 14px 36px; border-radius: 8px; font-size: 15px; letter-spacing: 0.5px;">
                Contact JetGlow to Schedule →
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px; margin: 0; text-align: center;">
              JetGlow Aviation — ORBIT Maintenance Program<br/>
              This is an automated notification from your ORBIT tracking system.
            </p>
          </div>
        </div>
      </div>
    `;

    const subject = `[${urgency}] ${aircraft.tail_number} — ${data.service_name} Maintenance Alert`;

    const emailPromises = [];

    // Send to admin
    emailPromises.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        to: ADMIN_EMAIL,
        subject,
        body: emailBody,
        from_name: "JetGlow ORBIT",
      })
    );

    // Send to customer if they have an email
    if (customerEmail) {
      emailPromises.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          subject,
          body: emailBody,
          from_name: "JetGlow Aviation",
        })
      );
    }

    await Promise.all(emailPromises);

    return Response.json({
      success: true,
      sent_to: [ADMIN_EMAIL, customerEmail].filter(Boolean),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});