import nodemailer from 'nodemailer';
import { CONFIG } from '../config/config.js'; // Import CONFIG to access email credentials

export class EmailTool {
    /**
     * Returns the tool declaration for the Gemini API.
     * The declaration defines the function name, description, and parameters.
     *
     * @returns {Object} The tool declaration.
     */
    getDeclaration() {
        return {
            name: 'sendEmail',
            description: 'Sends an email to a specified recipient.',
            parameters: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'The email address of the recipient.' },
                    subject: { type: 'string', description: 'The subject of the email.' },
                    body: { type: 'string', description: 'The body content of the email.' }
                },
                required: ['to', 'subject', 'body']
            }
        };
    }

    /**
     * Executes the email tool.
     * Sends an email to the specified recipient using the provided subject and body.
     *
     * @param {Object} args - The arguments for the tool.
     * @param {string} args.to - The email address of the recipient.
     * @param {string} args.subject - The subject of the email.
     * @param {string} args.body - The body content of the email.
     * @returns {Promise<string>} A promise that resolves with a success message.
     * @throws {Error} Throws an error if the email fails to send.
     */
    async execute(args) {
        const { to, subject, body } = args;

        // Validate input
        if (!to || !subject || !body) {
            throw new Error('Missing required fields: to, subject, or body.');
        }

        // Use email credentials from CONFIG or environment variables
        const emailUser = CONFIG.EMAIL.USER || process.env.EMAIL_USER;
        const emailPassword = CONFIG.EMAIL.PASSWORD || process.env.EMAIL_PASSWORD;

        if (!emailUser || !emailPassword) {
            throw new Error('Email credentials are not configured. Please set EMAIL_USER and EMAIL_PASSWORD in CONFIG or environment variables.');
        }

        // Create a transporter object using nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPassword
            }
        });

        // Define email options
        const mailOptions = {
            from: emailUser,
            to,
            subject,
            text: body
        };

        try {
            // Send the email
            await transporter.sendMail(mailOptions);
            return 'Email sent successfully.';
        } catch (error) {
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}