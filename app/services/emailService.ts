import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Order } from "../types/types";

/**
 * Email service — logs emails in development.
 * Replace logEmailNotification calls with real API calls
 * (e.g. Firebase Extension "Trigger Email", SendGrid, Mailgun)
 * when ready for production.
 */

interface EmailNotificationData {
  to: string;
  subject: string;
  body: string;
  type: string;
}

// Admin email — update this to the real business email
const ADMIN_EMAIL = "afroditis.delicacies@gmail.com";

class EmailService {
  // ─── Helpers ───────────────────────────────────────────────────────────────

  private logEmailNotification(data: EmailNotificationData): void {
    console.log("=".repeat(80));
    console.log("📧 EMAIL NOTIFICATION");
    console.log("=".repeat(80));
    console.log(`To: ${data.to}`);
    console.log(`Subject: ${data.subject}`);
    console.log(`Type: ${data.type}`);
    console.log("-".repeat(80));
    console.log(data.body);
    console.log("=".repeat(80));
  }

  private formatOrderItems(order: Order): string {
    return order.items
      .map((item) => {
        const sizes = item.quantities
          .map(
            (q) =>
              `${q.size} x${q.quantity} — $${(q.price * q.quantity).toFixed(2)}`,
          )
          .join(", ");
        const note = item.specialInstructions
          ? ` (Note: ${item.specialInstructions})`
          : "";
        return `  • ${item.dishName}: ${sizes}${note}`;
      })
      .join("\n");
  }

  private formatDeliveryDate(order: Order): string {
    const date = new Date(order.deliveryDate);
    return `${date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })} at ${order.deliveryTime}`;
  }

  // ─── Order Emails ──────────────────────────────────────────────────────────

  /**
   * Sent to customer immediately after placing an order.
   * Status: pending — tells them to wait for approval.
   */
  async sendOrderConfirmationToCustomer(order: Order): Promise<void> {
    try {
      const body = `
Dear ${order.customerName},

Thank you for your order at Afroditi's Delicacies!

Your order has been received and is currently pending review. We will send you an update once it has been approved.

─────────────────────────────────────────
ORDER DETAILS
─────────────────────────────────────────
Order ID:        ${order.orderCode}
Order Date:      ${new Date(order.orderDate).toLocaleString("en-US")}

Items Ordered:
${this.formatOrderItems(order)}

Subtotal:        $${order.subtotal.toFixed(2)}

Requested Delivery:  ${this.formatDeliveryDate(order)}

Delivery Address:
  ${order.deliveryAddress.fullAddress}

Payment Method:  ${order.paymentMethod === "pay_on_delivery" ? "Pay on Delivery" : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
─────────────────────────────────────────

We'll be in touch soon!

Warm regards,
Afroditi's Delicacies
      `.trim();

      this.logEmailNotification({
        to: order.customerEmail,
        subject: `Order Received — ${order.orderCode} | Afroditi's Delicacies`,
        body,
        type: "order_confirmation_customer",
      });
    } catch (error) {
      console.error("Error sending order confirmation email:", error);
    }
  }

  /**
   * Sent to the admin/business owner when a new order is placed.
   * Contains all order details so the owner can review from their inbox.
   */
  async sendNewOrderNotificationToAdmin(order: Order): Promise<void> {
    try {
      const body = `
A new order has been placed on Afroditi's Delicacies. Please log in to review and approve or decline it.

─────────────────────────────────────────
NEW ORDER DETAILS
─────────────────────────────────────────
Order ID:        ${order.orderCode}
Order Date:      ${new Date(order.orderDate).toLocaleString("en-US")}

Customer:        ${order.customerName}
Email:           ${order.customerEmail}
Phone:           ${order.customerPhone}

Items Ordered:
${this.formatOrderItems(order)}

Subtotal:        $${order.subtotal.toFixed(2)}

Requested Delivery:  ${this.formatDeliveryDate(order)}

Delivery Address:
  ${order.deliveryAddress.fullAddress}

Payment Method:  ${order.paymentMethod === "pay_on_delivery" ? "Pay on Delivery" : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
─────────────────────────────────────────

Log in to the website to approve or decline this order.
      `.trim();

      this.logEmailNotification({
        to: ADMIN_EMAIL,
        subject: `⚡ New Order — ${order.orderCode} from ${order.customerName}`,
        body,
        type: "new_order_admin",
      });
    } catch (error) {
      console.error("Error sending admin order notification:", error);
    }
  }

  /**
   * Sent to customer when admin approves their order.
   */
  async sendOrderApprovedToCustomer(order: Order): Promise<void> {
    try {
      const body = `
Dear ${order.customerName},

Great news! Your order has been approved and is now being prepared.

─────────────────────────────────────────
ORDER CONFIRMATION
─────────────────────────────────────────
Order ID:        ${order.orderCode}

Items:
${this.formatOrderItems(order)}

Subtotal:        $${order.subtotal.toFixed(2)}

Delivery:        ${this.formatDeliveryDate(order)}
Address:         ${order.deliveryAddress.fullAddress}

Payment:         ${order.paymentMethod === "pay_on_delivery" ? "Pay on Delivery" : order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
─────────────────────────────────────────

We're cooking with love and can't wait for you to enjoy your meal!

Warm regards,
Afroditi's Delicacies
      `.trim();

      this.logEmailNotification({
        to: order.customerEmail,
        subject: `✅ Order Approved — ${order.orderCode} | Afroditi's Delicacies`,
        body,
        type: "order_approved_customer",
      });
    } catch (error) {
      console.error("Error sending order approved email:", error);
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
      const noteSection = adminNotes
        ? `\nReason / Admin Note:\n  ${adminNotes}\n`
        : "";

      const body = `
Dear ${order.customerName},

We're sorry, but unfortunately we are unable to fulfill your order at this time.

─────────────────────────────────────────
ORDER DETAILS
─────────────────────────────────────────
Order ID:        ${order.orderCode}
Requested Delivery:  ${this.formatDeliveryDate(order)}
${noteSection}
─────────────────────────────────────────

We apologize for the inconvenience. Please feel free to place a new order with a different delivery date, or contact us directly if you'd like to discuss alternatives.

Warm regards,
Afroditi's Delicacies
      `.trim();

      this.logEmailNotification({
        to: order.customerEmail,
        subject: `Order Update — ${order.orderCode} | Afroditi's Delicacies`,
        body,
        type: "order_declined_customer",
      });
    } catch (error) {
      console.error("Error sending order declined email:", error);
    }
  }

  // ─── Existing Auth Emails (preserved) ─────────────────────────────────────

  async sendPasswordChangeNotification(
    userId: string,
    userEmail: string,
  ): Promise<void> {
    try {
      const timestamp = new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      });

      this.logEmailNotification({
        to: userEmail,
        subject: "Your Password Has Been Changed — Afroditi's Delicacies",
        body: this.getPasswordChangeEmailTemplate(userEmail),
        type: "password_change",
      });
    } catch (error) {
      console.error("Error sending password change notification:", error);
    }
  }

  private getPasswordChangeEmailTemplate(email: string): string {
    const timestamp = new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    return `
Dear Customer,

This email confirms that your password for Afroditi's Delicacies has been successfully changed.

Account Email: ${email}
Changed On: ${timestamp}

If you did not make this change, please contact us immediately at ${ADMIN_EMAIL} or reset your password right away.

Best regards,
The Afroditi's Delicacies Team
    `.trim();
  }

  async sendEmailChangeNotification(
    oldEmail: string,
    newEmail: string,
  ): Promise<void> {
    try {
      this.logEmailNotification({
        to: oldEmail,
        subject: "Email Address Changed — Afroditi's Delicacies",
        body: `Your email address has been changed from ${oldEmail} to ${newEmail}. If you did not make this change, please contact us immediately.`,
        type: "email_change",
      });

      this.logEmailNotification({
        to: newEmail,
        subject: "Welcome to Your New Email — Afroditi's Delicacies",
        body: `Your email address for Afroditi's Delicacies has been successfully updated to ${newEmail}.`,
        type: "email_change",
      });
    } catch (error) {
      console.error("Error sending email change notification:", error);
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
