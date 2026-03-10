"""
Email notification service for the Gym Booking system.

This service handles sending email notifications for various events such as:
- Facility requests (creation, approval, rejection)
- Booking notifications
- Member status changes
"""

import logging
from typing import Optional, List
from datetime import datetime
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""

    def __init__(self):
        """Initialize the email service with SMTP configuration."""
        # Only initialize if SMTP is configured
        if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
            logger.warning(
                "Email service not configured. Set SMTP_HOST, SMTP_USERNAME, "
                "SMTP_PASSWORD in environment variables to enable email notifications."
            )
            self.mail = None
            self.enabled = False
            return

        try:
            conf = ConnectionConfig(
                MAIL_USERNAME=settings.SMTP_USERNAME,
                MAIL_PASSWORD=settings.SMTP_PASSWORD or "",
                MAIL_FROM=settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME,
                MAIL_FROM_NAME=settings.SMTP_FROM_NAME,
                MAIL_PORT=settings.SMTP_PORT,
                MAIL_SERVER=settings.SMTP_HOST,
                MAIL_STARTTLS=settings.SMTP_USE_TLS,
                MAIL_SSL_TLS=settings.SMTP_USE_SSL,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True,
                TEMPLATE_FOLDER=None,  # We'll use inline templates
            )
            self.mail = FastMail(conf)
            self.enabled = True
            logger.info("Email service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize email service: {e}")
            self.mail = None
            self.enabled = False

    async def send_email(
        self,
        to_email: str | List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Send an email.

        Args:
            to_email: Recipient email address or list of addresses
            subject: Email subject line
            html_content: HTML body of the email
            text_content: Optional plain text version of the email

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled:
            logger.warning(f"Email service disabled. Would have sent: {subject} to {to_email}")
            return False

        try:
            # Convert single email to list
            recipients = [to_email] if isinstance(to_email, str) else to_email

            message = MessageSchema(
                subject=subject,
                recipients=recipients,
                body=html_content,
                subtype=MessageType.html,
            )

            await self.mail.send_message(message)
            logger.info(f"Email sent successfully to {recipients}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_facility_request_submitted(
        self,
        user_email: str,
        user_name: str,
        facility_type: str,
        start_date: datetime,
        end_date: datetime,
        purpose: str,
    ) -> bool:
        """
        Send confirmation email to user when they submit a facility request.

        Args:
            user_email: User's email address
            user_name: User's full name
            facility_type: Type of facility requested
            start_date: Request start date/time
            end_date: Request end date/time
            purpose: Purpose of the request

        Returns:
            True if email was sent successfully
        """
        subject = "Facility Request Submitted - Awaiting Approval"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Facility Request Submitted</h2>

                    <p>Hello {user_name},</p>

                    <p>Your facility request has been submitted successfully and is now awaiting admin approval.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Request Details:</h3>
                        <p><strong>Facility Type:</strong> {facility_type}</p>
                        <p><strong>Start Date:</strong> {start_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>End Date:</strong> {end_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>Purpose:</strong> {purpose}</p>
                    </div>

                    <p>You will receive an email notification once an administrator has reviewed your request.</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME}</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(user_email, subject, html_content)

    async def send_facility_request_approved(
        self,
        user_email: str,
        user_name: str,
        facility_type: str,
        start_date: datetime,
        end_date: datetime,
        approved_by_name: str,
    ) -> bool:
        """
        Send notification email when a facility request is approved.

        Args:
            user_email: User's email address
            user_name: User's full name
            facility_type: Type of facility requested
            start_date: Request start date/time
            end_date: Request end date/time
            approved_by_name: Name of the admin who approved

        Returns:
            True if email was sent successfully
        """
        subject = "Facility Request Approved ✓"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 5px; text-align: center;">
                        <h2 style="margin: 0;">✓ Request Approved!</h2>
                    </div>

                    <p style="margin-top: 20px;">Hello {user_name},</p>

                    <p>Great news! Your facility request has been approved by {approved_by_name}.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Approved Request Details:</h3>
                        <p><strong>Facility Type:</strong> {facility_type}</p>
                        <p><strong>Start Date:</strong> {start_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>End Date:</strong> {end_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                    </div>

                    <p>Your facility booking is now confirmed. Please make sure to arrive on time and follow all facility guidelines.</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME}</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(user_email, subject, html_content)

    async def send_facility_request_rejected(
        self,
        user_email: str,
        user_name: str,
        facility_type: str,
        start_date: datetime,
        end_date: datetime,
        rejected_by_name: str,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Send notification email when a facility request is rejected.

        Args:
            user_email: User's email address
            user_name: User's full name
            facility_type: Type of facility requested
            start_date: Request start date/time
            end_date: Request end date/time
            rejected_by_name: Name of the admin who rejected
            reason: Optional reason for rejection

        Returns:
            True if email was sent successfully
        """
        subject = "Facility Request Update"

        reason_html = ""
        if reason:
            reason_html = f"""
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0;"><strong>Reason:</strong> {reason}</p>
                </div>
            """

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Facility Request Update</h2>

                    <p>Hello {user_name},</p>

                    <p>We regret to inform you that your facility request has not been approved at this time.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Request Details:</h3>
                        <p><strong>Facility Type:</strong> {facility_type}</p>
                        <p><strong>Start Date:</strong> {start_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>End Date:</strong> {end_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>Reviewed by:</strong> {rejected_by_name}</p>
                    </div>

                    {reason_html}

                    <p>If you have any questions or would like to submit a new request, please feel free to do so through the booking system.</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME}</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(user_email, subject, html_content)

    async def notify_admins_new_facility_request(
        self,
        user_name: str,
        facility_type: str,
        start_date: datetime,
        end_date: datetime,
        purpose: str,
    ) -> bool:
        """
        Send notification to admins when a new facility request is submitted.

        Args:
            user_name: Name of the user who submitted
            facility_type: Type of facility requested
            start_date: Request start date/time
            end_date: Request end date/time
            purpose: Purpose of the request

        Returns:
            True if email was sent successfully
        """
        if not settings.ADMIN_EMAILS:
            logger.warning("No admin emails configured. Cannot notify admins.")
            return False

        # Parse admin emails (comma-separated)
        admin_emails = [email.strip() for email in settings.ADMIN_EMAILS.split(",") if email.strip()]

        if not admin_emails:
            logger.warning("Admin emails list is empty after parsing.")
            return False

        subject = f"New Facility Request from {user_name}"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 5px;">
                        <h2 style="margin: 0;">New Facility Request Pending Review</h2>
                    </div>

                    <p style="margin-top: 20px;">A new facility request has been submitted and requires your review.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Request Details:</h3>
                        <p><strong>Requested by:</strong> {user_name}</p>
                        <p><strong>Facility Type:</strong> {facility_type}</p>
                        <p><strong>Start Date:</strong> {start_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>End Date:</strong> {end_date.strftime('%B %d, %Y at %I:%M %p')}</p>
                        <p><strong>Purpose:</strong> {purpose}</p>
                    </div>

                    <p>Please log in to the admin dashboard to review and approve/reject this request.</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME} System</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(admin_emails, subject, html_content)


    async def send_registration_confirmation(
        self,
        user_email: str,
        user_name: str,
        user_role: str,
    ) -> bool:
        """
        Send confirmation email to user when they register.

        Args:
            user_email: User's email address
            user_name: User's full name
            user_role: User's role (MEMBER, COACH, ADMIN)

        Returns:
            True if email was sent successfully
        """
        role_display = {
            "MEMBER": "Member",
            "COACH": "Coach",
            "ADMIN": "Administrator"
        }.get(user_role, user_role)

        subject = "Registration Successful - Awaiting Approval"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Welcome to {settings.SMTP_FROM_NAME}!</h2>

                    <p>Hello {user_name},</p>

                    <p>Thank you for registering as a <strong>{role_display}</strong>. Your account has been created successfully!</p>

                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0;"><strong>⏳ Pending Approval</strong></p>
                        <p style="margin: 5px 0 0 0;">Your account is currently awaiting administrator approval. You will receive an email notification once your account has been reviewed.</p>
                    </div>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">Account Details:</h3>
                        <p><strong>Email:</strong> {user_email}</p>
                        <p><strong>Role:</strong> {role_display}</p>
                    </div>

                    <p>Once approved, you'll be able to:</p>
                    <ul>
                        <li>Book gym facilities</li>
                        <li>View your booking history</li>
                        <li>Request special facility access</li>
                        {'<li>Book pitches and training facilities</li>' if user_role == 'COACH' else ''}
                    </ul>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME} Team</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(user_email, subject, html_content)

    async def notify_admins_new_registration(
        self,
        user_name: str,
        user_email: str,
        user_role: str,
        phone: str = None,
    ) -> bool:
        """
        Send notification to admins when a new user registers.

        Args:
            user_name: Name of the user who registered
            user_email: Email of the new user
            user_role: User's role (MEMBER, COACH, ADMIN)
            phone: Optional phone number

        Returns:
            True if email was sent successfully
        """
        if not settings.ADMIN_EMAILS:
            logger.warning("No admin emails configured. Cannot notify admins.")
            return False

        # Parse admin emails (comma-separated)
        admin_emails = [email.strip() for email in settings.ADMIN_EMAILS.split(",") if email.strip()]

        if not admin_emails:
            logger.warning("Admin emails list is empty after parsing.")
            return False

        role_display = {
            "MEMBER": "Member",
            "COACH": "Coach",
            "ADMIN": "Administrator"
        }.get(user_role, user_role)

        subject = f"New {role_display} Registration - {user_name}"

        phone_html = f"<p><strong>Phone:</strong> {phone}</p>" if phone else ""

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 5px;">
                        <h2 style="margin: 0;">New User Registration Pending Approval</h2>
                    </div>

                    <p style="margin-top: 20px;">A new user has registered and requires approval to access the system.</p>

                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">User Details:</h3>
                        <p><strong>Name:</strong> {user_name}</p>
                        <p><strong>Email:</strong> {user_email}</p>
                        <p><strong>Role:</strong> {role_display}</p>
                        {phone_html}
                    </div>

                    <p>Please log in to the admin dashboard to review and approve/reject this registration.</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME} System</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated notification. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(admin_emails, subject, html_content)

    async def send_membership_approved(
        self,
        user_email: str,
        user_name: str,
        user_role: str,
        approved_by_name: str,
    ) -> bool:
        """
        Send notification email when a membership is approved.

        Args:
            user_email: User's email address
            user_name: User's full name
            user_role: User's role (MEMBER, COACH, ADMIN)
            approved_by_name: Name of the admin who approved

        Returns:
            True if email was sent successfully
        """
        role_display = {
            "MEMBER": "Member",
            "COACH": "Coach",
            "ADMIN": "Administrator"
        }.get(user_role, user_role)

        subject = "Membership Approved - Welcome!"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 5px; text-align: center;">
                        <h2 style="margin: 0;">✓ Membership Approved!</h2>
                    </div>

                    <p style="margin-top: 20px;">Hello {user_name},</p>

                    <p>Great news! Your {role_display.lower()} membership has been approved by {approved_by_name}.</p>

                    <div style="background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <p style="margin: 0;"><strong>✓ You're all set!</strong></p>
                        <p style="margin: 5px 0 0 0;">You can now log in and start using all available facilities.</p>
                    </div>

                    <p><strong>You can now:</strong></p>
                    <ul>
                        <li>Book gym time slots</li>
                        <li>View and manage your bookings</li>
                        <li>Submit facility requests for special events</li>
                        {'<li>Book pitches and training facilities</li>' if user_role == 'COACH' else ''}
                    </ul>

                    <p>Log in to get started!</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME} Team</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(user_email, subject, html_content)

    async def send_membership_suspended(
        self,
        user_email: str,
        user_name: str,
        suspended_by_name: str,
    ) -> bool:
        """
        Send notification email when a membership is suspended.

        Args:
            user_email: User's email address
            user_name: User's full name
            suspended_by_name: Name of the admin who suspended

        Returns:
            True if email was sent successfully
        """
        subject = "Membership Suspended"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #dc2626;">Membership Status Update</h2>

                    <p>Hello {user_name},</p>

                    <p>This is to inform you that your membership has been suspended.</p>

                    <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
                        <p style="margin: 0;"><strong>Account Suspended</strong></p>
                        <p style="margin: 5px 0 0 0;">You will not be able to make bookings or access facilities while your membership is suspended.</p>
                    </div>

                    <p>If you have any questions or believe this is a mistake, please contact the administrators.</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME} Team</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(user_email, subject, html_content)

    async def send_membership_reactivated(
        self,
        user_email: str,
        user_name: str,
        reactivated_by_name: str,
    ) -> bool:
        """
        Send notification email when a membership is reactivated.

        Args:
            user_email: User's email address
            user_name: User's full name
            reactivated_by_name: Name of the admin who reactivated

        Returns:
            True if email was sent successfully
        """
        subject = "Membership Reactivated - Welcome Back!"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 5px; text-align: center;">
                        <h2 style="margin: 0;">✓ Membership Reactivated!</h2>
                    </div>

                    <p style="margin-top: 20px;">Hello {user_name},</p>

                    <p>Welcome back! Your membership has been reactivated by {reactivated_by_name}.</p>

                    <div style="background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
                        <p style="margin: 0;"><strong>✓ Active Again!</strong></p>
                        <p style="margin: 5px 0 0 0;">You can now access all facilities and make bookings again.</p>
                    </div>

                    <p>Log in to resume using the facilities!</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>{settings.SMTP_FROM_NAME} Team</strong>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
            </body>
        </html>
        """

        return await self.send_email(user_email, subject, html_content)


# Singleton instance
email_service = EmailService()
