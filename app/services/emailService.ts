import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Email service to send notifications using a backend API or Firebase Functions
 * Note: This is a client-side service that calls a backend endpoint
 */

interface EmailNotificationData {
    to: string;
    subject: string;
    body: string;
    type: 'password_change' | 'email_change' | 'order_confirmation';
}

class EmailService {
    /**
     * Send password change notification email
     */
    async sendPasswordChangeNotification(userId: string, userEmail: string): Promise<void> {
        try {
            // In production, you would call a backend API or Firebase Function here
            // For now, we'll use Firebase's built-in email sending

            console.log(`Password change notification would be sent to: ${userEmail}`);

            // TODO: Implement actual email sending via:
            // 1. Firebase Functions with SendGrid/Mailgun
            // 2. Your own backend API
            // 3. Firebase Extensions (Trigger Email)

            // Example of what the API call would look like:
            /*
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: userEmail,
                    subject: 'Password Changed - Afroditi\'s Delicacies',
                    template: 'password-change',
                    data: {
                        timestamp: new Date().toLocaleString(),
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send email notification');
            }
            */

            // For now, we'll simulate email sending with a console log
            // This should be replaced with actual email implementation
            this.logEmailNotification({
                to: userEmail,
                subject: 'Your Password Has Been Changed - Afroditi\'s Delicacies',
                body: this.getPasswordChangeEmailTemplate(userEmail),
                type: 'password_change',
            });

        } catch (error) {
            console.error('Error sending password change notification:', error);
            // Don't throw error - we don't want password change to fail if email fails
        }
    }

    /**
     * Get email template for password change notification
     */
    private getPasswordChangeEmailTemplate(email: string): string {
        const timestamp = new Date().toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short',
        });

        return `
            Dear Customer,

            This email confirms that your password for Afroditi's Delicacies has been successfully changed.

            Account Email: ${email}
            Changed On: ${timestamp}

            If you did not make this change, please contact us immediately at contact@afroditisdelicacies.com or reset your password right away.

            For your security:
            - Never share your password with anyone
            - Use a strong, unique password
            - Enable two-factor authentication if available

            If you have any questions or concerns, please don't hesitate to reach out.

            Best regards,
            The Afroditi's Delicacies Team

            ---
            This is an automated security notification from Afroditi's Delicacies.
        `;
    }

    /**
     * Log email notification (for development/debugging)
     */
    private logEmailNotification(data: EmailNotificationData): void {
        console.log('='.repeat(80));
        console.log('📧 EMAIL NOTIFICATION');
        console.log('='.repeat(80));
        console.log(`To: ${data.to}`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Type: ${data.type}`);
        console.log('-'.repeat(80));
        console.log(data.body);
        console.log('='.repeat(80));
    }

    /**
     * Send email change notification
     */
    async sendEmailChangeNotification(oldEmail: string, newEmail: string): Promise<void> {
        try {
            console.log(`Email change notification: ${oldEmail} -> ${newEmail}`);

            // Send notification to both old and new email addresses
            this.logEmailNotification({
                to: oldEmail,
                subject: 'Email Address Changed - Afroditi\'s Delicacies',
                body: `Your email address has been changed from ${oldEmail} to ${newEmail}. If you did not make this change, please contact us immediately.`,
                type: 'email_change',
            });

            this.logEmailNotification({
                to: newEmail,
                subject: 'Welcome to Your New Email - Afroditi\'s Delicacies',
                body: `Your email address for Afroditi's Delicacies has been successfully updated to ${newEmail}.`,
                type: 'email_change',
            });
        } catch (error) {
            console.error('Error sending email change notification:', error);
        }
    }
}

// Export singleton instance
export const emailService = new EmailService();