import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Order } from "../types/types";

interface EmailNotificationData {
  to: string;
  subject: string;
  body: string;
  type: string;
}

// ─── Shared HTML Helpers ────────────────────────────────────────────────────

const BRAND = {
  green: "#6B7E3F",
  darkGreen: "#4A5530",
  gold: "#B8922A",
  blue: "#76A4B5",
  bg: "#F5F0E4",
  text: "#1C1A14",
  muted: "#7A7265",
  lightBorder: "#E0D8C8",
  red: "#C75146",
};

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Afroditi's Delicacies</title>
</head>
<body style="margin:0;padding:0;background-color:#EDE5D0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EDE5D0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:0;overflow:hidden;box-shadow:0 2px 16px rgba(28,26,20,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND.darkGreen};padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.gold};font-family:Georgia,serif;">Homemade Greek Cuisine</p>
              <h1 style="margin:0;font-size:28px;font-weight:normal;color:#ffffff;font-family:Georgia,serif;letter-spacing:1px;">Afroditi's Delicacies</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;color:${BRAND.text};">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${BRAND.bg};border-top:1px solid ${BRAND.lightBorder};padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:13px;color:${BRAND.muted};font-family:Georgia,serif;">Questions? Reach us at</p>
              <a href="mailto:info@afroditisdelicacies.com" style="color:${BRAND.green};font-size:13px;text-decoration:none;font-family:Georgia,serif;">info@afroditisdelicacies.com</a>
              <p style="margin:16px 0 0 0;font-size:11px;color:${BRAND.muted};font-family:Georgia,serif;">© ${new Date().getFullYear()} Afroditi's Delicacies · Bothell, WA</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sectionDivider(): string {
  return `<tr><td style="padding:0 0 20px 0;"><hr style="border:none;border-top:1px solid ${BRAND.lightBorder};margin:0;" /></td></tr>`;
}

function orderItemsTable(order: Order): string {
  const rows = order.items
    .map((item) => {
      const sizeRows = item.quantities
        .map(
          (q) => `
          <tr>
            <td style="padding:8px 0;font-size:15px;color:${BRAND.text};font-family:Georgia,serif;">
              ${item.dishName}
              <span style="font-size:13px;color:${BRAND.muted};"> (${q.size})</span>
              ${item.specialInstructions ? `<br/><span style="font-size:12px;color:${BRAND.muted};font-style:italic;">Note: ${item.specialInstructions}</span>` : ""}
            </td>
            <td style="padding:8px 0;font-size:15px;color:${BRAND.muted};text-align:center;font-family:Georgia,serif;">×${q.quantity}</td>
            <td style="padding:8px 0;font-size:15px;color:${BRAND.text};text-align:right;font-family:Georgia,serif;">$${(q.price * q.quantity).toFixed(2)}</td>
          </tr>`,
        )
        .join("");
      return sizeRows;
    })
    .join(
      `<tr><td colspan="3" style="padding:0;"><hr style="border:none;border-top:1px solid ${BRAND.lightBorder};margin:4px 0;" /></td></tr>`,
    );

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;text-align:left;border-bottom:2px solid ${BRAND.lightBorder};">Item</th>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;text-align:center;border-bottom:2px solid ${BRAND.lightBorder};">Qty</th>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;text-align:right;border-bottom:2px solid ${BRAND.lightBorder};">Price</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="2" style="padding:12px 0 0 0;font-size:15px;font-weight:bold;color:${BRAND.text};font-family:Georgia,serif;border-top:2px solid ${BRAND.lightBorder};">Total</td>
          <td style="padding:12px 0 0 0;font-size:17px;font-weight:bold;color:${BRAND.green};text-align:right;font-family:Georgia,serif;border-top:2px solid ${BRAND.lightBorder};">$${(order.discountedSubtotal ?? order.subtotal).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>`;
}

function infoGrid(fields: { label: string; value: string }[]): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      ${fields
        .map(
          ({ label, value }) => `
        <tr>
          <td style="padding:7px 0;width:38%;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;vertical-align:top;">${label}</td>
          <td style="padding:7px 0;font-size:15px;color:${BRAND.text};font-family:Georgia,serif;vertical-align:top;">${value}</td>
        </tr>`,
        )
        .join("")}
    </table>`;
}

function alertBox(color: string, bgColor: string, html: string): string {
  return `<div style="background:${bgColor};border-left:4px solid ${color};border-radius:0;padding:16px 20px;margin:20px 0;font-family:Georgia,serif;font-size:15px;color:${BRAND.text};">${html}</div>`;
}

function paymentBox(order: Order): string {
  const amount = (order.discountedSubtotal ?? order.subtotal).toFixed(2);

  if (order.paymentMethod === "pay_on_delivery") {
    return alertBox(
      BRAND.green,
      "#EEF2E6",
      `<strong>Payment on Delivery</strong><br/>No action needed — we'll collect your payment when we arrive.`,
    );
  }
  if (order.paymentMethod === "venmo") {
    return alertBox(
      BRAND.blue,
      "#EDF3F6",
      `<strong>Venmo Payment</strong><br/>Please send <strong>$${amount}</strong> to:<br/>
      <a href="https://venmo.com/Afroditi-Kritikou" style="color:${BRAND.blue};font-weight:bold;">@Afroditi-Kritikou on Venmo</a>`,
    );
  }
  return alertBox(
    BRAND.gold,
    "#F5F0E4",
    `<strong>PayPal Payment</strong><br/>Please send <strong>$${amount}</strong> to:<br/>
    <a href="https://paypal.me/AfroditiSDeli" style="color:${BRAND.gold};font-weight:bold;">paypal.me/AfroditiSDeli</a>`,
  );
}

function formatDeliveryDate(order: Order): string {
  const date = new Date(order.deliveryDate);
  return `${date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} at ${order.deliveryTime}`;
}

function formatPaymentLabel(method: string): string {
  if (method === "pay_on_delivery") return "Cash / Check on Delivery";
  if (method === "venmo") return "Venmo";
  if (method === "paypal") return "PayPal";
  return method;
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0];
}

// ─── Email Service Class ────────────────────────────────────────────────────

class EmailService {
  private async sendEmail(data: EmailNotificationData): Promise<void> {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: data.to,
        subject: data.subject,
        html: data.body,
        replyTo: "info@afroditisdelicacies.com",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send email");
    }
  }

  private async getAdminEmails(): Promise<string[]> {
    const configSnap = await getDoc(doc(db, "adminSettings", "config"));
    if (!configSnap.exists()) {
      console.error("adminSettings/config document not found.");
      return [];
    }
    const adminEmails: string[] = configSnap.data().adminEmails ?? [];
    if (adminEmails.length === 0) {
      console.error("adminEmails array is empty in adminSettings/config.");
    }
    return adminEmails;
  }

  private async sendAdminCopies(
    adminEmails: string[],
    subject: string,
    body: string,
    type: string,
  ): Promise<void> {
    for (const adminEmail of adminEmails) {
      await this.sendEmail({ to: adminEmail, subject, body, type });
    }
  }

  // ─── Order Emails ──────────────────────────────────────────────────────────

  /**
   * Sent to customer immediately after placing an order (status: pending).
   */
  async sendOrderConfirmationToCustomer(order: Order): Promise<void> {
    try {
      const content = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.darkGreen};font-family:Georgia,serif;">Order Received!</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">Hi ${firstName(order.customerName)}, we've got your order and it's currently pending approval. We'll send you a confirmation once it's been reviewed.</p>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Order Summary</p>
        ${orderItemsTable(order)}

        <div style="height:24px;"></div>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Delivery Details</p>
        ${infoGrid([
          {
            label: "Order ID",
            value: `<span style="font-family:monospace;font-size:14px;background:#EEF2E6;padding:2px 8px;">${order.orderCode}</span>`,
          },
          { label: "Delivery", value: formatDeliveryDate(order) },
          { label: "Address", value: order.deliveryAddress.fullAddress },
          { label: "Payment", value: formatPaymentLabel(order.paymentMethod) },
        ])}

        ${paymentBox(order)}

        <p style="margin:24px 0 0 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;line-height:1.7;">
          Thank you for choosing Afroditi's Delicacies. We'll be in touch shortly!<br/>
          <span style="color:${BRAND.green};font-style:italic;">— Afroditi</span>
        </p>
      `;

      await this.sendEmail({
        to: order.customerEmail,
        subject: `Order Received — ${order.orderCode} | Afroditi's Delicacies`,
        body: emailWrapper(content),
        type: "order_confirmation_customer",
      });
    } catch (error) {
      console.error("Error sending order confirmation email:", error);
    }
  }

  /**
   * Sent to admin(s) when a new order is placed.
   */
  async sendNewOrderNotificationToAdmin(order: Order): Promise<void> {
    try {
      const content = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.darkGreen};font-family:Georgia,serif;">New Order Received</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">A new order has been placed and is awaiting your approval.</p>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Customer Details</p>
        ${infoGrid([
          { label: "Name", value: order.customerName },
          {
            label: "Email",
            value: `<a href="mailto:${order.customerEmail}" style="color:${BRAND.green};">${order.customerEmail}</a>`,
          },
          {
            label: "Phone",
            value: `<a href="tel:${order.customerPhone}" style="color:${BRAND.green};">${order.customerPhone}</a>`,
          },
        ])}

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Order Details</p>
        ${orderItemsTable(order)}

        <div style="height:24px;"></div>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Delivery & Payment</p>
        ${infoGrid([
          {
            label: "Order ID",
            value: `<span style="font-family:monospace;font-size:14px;background:#EEF2E6;padding:2px 8px;">${order.orderCode}</span>`,
          },
          {
            label: "Order Date",
            value: new Date(order.orderDate).toLocaleString("en-US", {
              dateStyle: "full",
              timeStyle: "short",
            }),
          },
          { label: "Delivery", value: formatDeliveryDate(order) },
          { label: "Address", value: order.deliveryAddress.fullAddress },
          { label: "Payment", value: formatPaymentLabel(order.paymentMethod) },
        ])}

        ${alertBox(BRAND.gold, "#F5F0E4", `<strong>Action Required:</strong> Log in to the website to approve or decline this order.`)}

        <div style="text-align:center;margin-top:24px;">
          <a href="https://www.afroditisdelicacies.com/orders" style="display:inline-block;background-color:${BRAND.darkGreen};color:#ffffff;font-family:Georgia,serif;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:0;letter-spacing:0.5px;">View Order Dashboard</a>
        </div>
      `;

      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length === 0) return;

      await this.sendAdminCopies(
        adminEmails,
        `New Order — ${order.orderCode} from ${order.customerName} | Afroditi's Delicacies`,
        emailWrapper(content),
        "new_order_admin",
      );
    } catch (error) {
      console.error("Error sending admin order notification:", error);
    }
  }

  /**
   * Sent to customer when admin approves their order.
   */
  async sendOrderApprovedToCustomer(order: Order): Promise<void> {
    try {
      const content = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.darkGreen};font-family:Georgia,serif;">Your Order is Confirmed!</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">Hi ${firstName(order.customerName)}, great news — your order has been approved and we're getting to work in the kitchen!</p>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Order Confirmation</p>
        ${orderItemsTable(order)}

        <div style="height:24px;"></div>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Delivery Details</p>
        ${infoGrid([
          {
            label: "Order ID",
            value: `<span style="font-family:monospace;font-size:14px;background:#EEF2E6;padding:2px 8px;">${order.orderCode}</span>`,
          },
          { label: "Delivery", value: formatDeliveryDate(order) },
          { label: "Address", value: order.deliveryAddress.fullAddress },
          { label: "Payment", value: formatPaymentLabel(order.paymentMethod) },
        ])}

        ${paymentBox(order)}

        ${
          order.discountPercent && order.discountedSubtotal
            ? alertBox(
                BRAND.green,
                "#EEF2E6",
                `<strong>🎉 ${order.discountPercent}% Discount Applied!</strong><br/>
        Your order total has been reduced from
        <span style="text-decoration:line-through;color:${BRAND.muted};">$${(order.discountedSubtotal / (1 - order.discountPercent / 100)).toFixed(2)}</span>
        to <strong style="color:${BRAND.darkGreen};">$${order.discountedSubtotal.toFixed(2)}</strong>.`,
              )
            : ""
        }

        <p style="margin:24px 0 0 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;line-height:1.7;">
          We're cooking with love and can't wait for you to enjoy your meal!<br/>
          <span style="color:${BRAND.green};font-style:italic;">— Afroditi</span>
        </p>
      `;

      const customerSubject = `Order Confirmed — ${order.orderCode} | Afroditi's Delicacies`;
      const emailBody = emailWrapper(content);

      await this.sendEmail({
        to: order.customerEmail,
        subject: customerSubject,
        body: emailBody,
        type: "order_approved_customer",
      });

      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length > 0) {
        await this.sendAdminCopies(
          adminEmails,
          `[Admin Copy] ${customerSubject}`,
          emailBody,
          "order_approved_admin_copy",
        );
      }
    } catch (error) {
      console.error("Error sending order approved email:", error);
    }
  }

  /**
   * Sent to customer when admin edits an active order's items.
   */
  async sendOrderUpdatedToCustomer(order: Order): Promise<void> {
    try {
      const content = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.darkGreen};font-family:Georgia,serif;">Your Order Has Been Updated</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">Hi ${firstName(order.customerName)}, we've made a change to your order. Here's the updated summary:</p>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Updated Order</p>
        ${orderItemsTable(order)}

        <div style="height:24px;"></div>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Delivery Details</p>
        ${infoGrid([
          {
            label: "Order ID",
            value: `<span style="font-family:monospace;font-size:14px;background:#EEF2E6;padding:2px 8px;">${order.orderCode}</span>`,
          },
          { label: "Delivery", value: formatDeliveryDate(order) },
          { label: "Address", value: order.deliveryAddress.fullAddress },
          { label: "Payment", value: formatPaymentLabel(order.paymentMethod) },
        ])}

        ${paymentBox(order)}

        <p style="margin:24px 0 0 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;line-height:1.7;">
          If you have any questions about these changes, please don't hesitate to reach out.<br/>
          <span style="color:${BRAND.green};font-style:italic;">— Afroditi</span>
        </p>
      `;

      const customerSubject = `Order Updated — ${order.orderCode} | Afroditi's Delicacies`;
      const emailBody = emailWrapper(content);

      await this.sendEmail({
        to: order.customerEmail,
        subject: customerSubject,
        body: emailBody,
        type: "order_updated_customer",
      });

      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length > 0) {
        await this.sendAdminCopies(
          adminEmails,
          `[Admin Copy] ${customerSubject}`,
          emailBody,
          "order_updated_admin_copy",
        );
      }
    } catch (error) {
      console.error("Error sending order updated email:", error);
    }
  }

  /**
   * Sent to customer when admin declines their order.
   */
  async sendOrderDeclinedToCustomer(
    order: Order,
    adminNotes?: string,
  ): Promise<void> {
    try {
      const noteHtml = adminNotes
        ? alertBox(
            BRAND.red,
            "#FDF0EF",
            `<strong>Note from Afroditi:</strong><br/>${adminNotes}`,
          )
        : "";

      const content = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.red};font-family:Georgia,serif;">Order Unable to be Fulfilled</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">Hi ${firstName(order.customerName)}, we're sorry — unfortunately we're unable to fulfill your order at this time.</p>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Order Details</p>
        ${infoGrid([
          {
            label: "Order ID",
            value: `<span style="font-family:monospace;font-size:14px;background:#EEF2E6;padding:2px 8px;">${order.orderCode}</span>`,
          },
          { label: "Requested Delivery", value: formatDeliveryDate(order) },
        ])}

        ${noteHtml}

        ${alertBox(BRAND.green, "#EEF2E6", `We'd love to serve you another time! Feel free to place a new order with a different delivery date, or <a href="mailto:info@afroditisdelicacies.com" style="color:${BRAND.green};">contact us</a> to discuss alternatives.`)}

        <p style="margin:24px 0 0 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;line-height:1.7;">
          We apologize for the inconvenience.<br/>
          <span style="color:${BRAND.green};font-style:italic;">— Afroditi</span>
        </p>
      `;

      const customerSubject = `Order Update — ${order.orderCode} | Afroditi's Delicacies`;
      const emailBody = emailWrapper(content);

      await this.sendEmail({
        to: order.customerEmail,
        subject: customerSubject,
        body: emailBody,
        type: "order_declined_customer",
      });

      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length > 0) {
        await this.sendAdminCopies(
          adminEmails,
          `[Admin Copy] ${customerSubject}`,
          emailBody,
          "order_declined_admin_copy",
        );
      }
    } catch (error) {
      console.error("Error sending order declined email:", error);
    }
  }

  /**
   * Sent to customer when admin scraps an already-approved order.
   */
  async sendOrderScrappedToCustomer(
    order: Order,
    adminNotes?: string,
  ): Promise<void> {
    try {
      const noteHtml = adminNotes
        ? alertBox(
            BRAND.red,
            "#FDF0EF",
            `<strong>Note from Afroditi:</strong><br/>${adminNotes}`,
          )
        : "";

      const content = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.red};font-family:Georgia,serif;">Your Order Has Been Cancelled</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">Hi ${firstName(order.customerName)}, we're sorry — your approved order had to be cancelled.</p>

        <table width="100%" cellpadding="0" cellspacing="0"><tbody>
          ${sectionDivider()}
        </tbody></table>

        <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.green};font-family:Georgia,serif;">Order Details</p>
        ${infoGrid([
          {
            label: "Order ID",
            value: `<span style="font-family:monospace;font-size:14px;background:#EEF2E6;padding:2px 8px;">${order.orderCode}</span>`,
          },
          { label: "Requested Delivery", value: formatDeliveryDate(order) },
        ])}

        ${noteHtml}

        ${alertBox(BRAND.green, "#EEF2E6", `We sincerely apologize for the inconvenience. Please feel free to place a new order or <a href="mailto:info@afroditisdelicacies.com" style="color:${BRAND.green};">contact us</a> directly and we'll do our best to accommodate you.`)}

        <p style="margin:24px 0 0 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;line-height:1.7;">
          We're sorry for any disruption this may have caused.<br/>
          <span style="color:${BRAND.green};font-style:italic;">— Afroditi</span>
        </p>
      `;

      const customerSubject = `Order Cancelled — ${order.orderCode} | Afroditi's Delicacies`;
      const emailBody = emailWrapper(content);

      await this.sendEmail({
        to: order.customerEmail,
        subject: customerSubject,
        body: emailBody,
        type: "order_scrapped_customer",
      });

      const adminEmails = await this.getAdminEmails();
      if (adminEmails.length > 0) {
        await this.sendAdminCopies(
          adminEmails,
          `[Admin Copy] ${customerSubject}`,
          emailBody,
          "order_scrapped_admin_copy",
        );
      }
    } catch (error) {
      console.error("Error sending order scrapped email:", error);
    }
  }

  // ─── Auth Emails ───────────────────────────────────────────────────────────

  async sendPasswordChangeNotification(userEmail: string): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      });

      const content = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.darkGreen};font-family:Georgia,serif;">Password Changed</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">Your password for Afroditi's Delicacies has been successfully updated.</p>

        ${infoGrid([
          { label: "Account", value: userEmail },
          { label: "Changed On", value: timestamp },
        ])}

        ${alertBox(BRAND.red, "#FDF0EF", `If you did not make this change, please <a href="mailto:info@afroditisdelicacies.com" style="color:${BRAND.red};font-weight:bold;">contact us immediately</a> or reset your password right away.`)}
      `;

      await this.sendEmail({
        to: userEmail,
        subject: "Password Changed — Afroditi's Delicacies",
        body: emailWrapper(content),
        type: "password_change",
      });
    } catch (error) {
      console.error("Error sending password change notification:", error);
    }
  }

  async sendEmailChangeNotification(
    oldEmail: string,
    newEmail: string,
  ): Promise<void> {
    try {
      const notifyOld = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.darkGreen};font-family:Georgia,serif;">Email Address Changed</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">The email address on your Afroditi's Delicacies account has been updated.</p>
        ${infoGrid([
          { label: "Old Email", value: oldEmail },
          { label: "New Email", value: newEmail },
        ])}
        ${alertBox(BRAND.red, "#FDF0EF", `If you did not make this change, please <a href="mailto:info@afroditisdelicacies.com" style="color:${BRAND.red};font-weight:bold;">contact us immediately</a>.`)}
      `;

      const notifyNew = `
        <h2 style="margin:0 0 6px 0;font-size:22px;font-weight:normal;color:${BRAND.darkGreen};font-family:Georgia,serif;">Welcome to Your New Email</h2>
        <p style="margin:0 0 24px 0;font-size:15px;color:${BRAND.muted};font-family:Georgia,serif;">Your Afroditi's Delicacies account email has been successfully updated to <strong>${newEmail}</strong>.</p>
        ${alertBox(BRAND.green, "#EEF2E6", `Future order notifications and updates will be sent to this address.`)}
      `;

      await this.sendEmail({
        to: oldEmail,
        subject: "Email Address Changed — Afroditi's Delicacies",
        body: emailWrapper(notifyOld),
        type: "email_change",
      });

      await this.sendEmail({
        to: newEmail,
        subject: "Welcome to Your New Email — Afroditi's Delicacies",
        body: emailWrapper(notifyNew),
        type: "email_change",
      });
    } catch (error) {
      console.error("Error sending email change notification:", error);
    }
  }
}

export const emailService = new EmailService();
