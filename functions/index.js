const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled function to monitor deadlines and send task overdue warnings
 * Runs every minute to guarantee real-time reminders.
 */
exports.scheduledTaskReminder = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);

  console.log(`[TaskReminder] Running scheduler at ${new Date().toISOString()}`);

  try {
    // Standard query for pending, unnotified tasks to avoid composite indexes
    const tasksSnapshot = await db.collection('tasks')
      .where('status', '==', 'pending')
      .get();

    const overdueTasks = [];
    const approachingTasks = [];

    tasksSnapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;
      const dueDate = data.dueDate ? data.dueDate.toDate() : null;

      if (!dueDate) return;

      // 1. Check for OVERDUE tasks that have not triggered an FCM push alert
      if (dueDate <= now.toDate() && data.notified !== true) {
        overdueTasks.push({ id, ...data, dueDate });
      }

      // 2. Check for APPROACHING tasks (30 mins before) that haven't sent warning mails
      const diffMs = dueDate.getTime() - Date.now();
      const isWithin30MinsCap = diffMs > 0 && diffMs <= 30 * 60 * 1000;
      if (isWithin30MinsCap && data.emailSent !== true) {
        approachingTasks.push({ id, ...data, dueDate });
      }
    });

    console.log(`[TaskReminder] Found ${overdueTasks.length} overdue tasks and ${approachingTasks.length} approaching tasks.`);

    // --- Processing 1: Overdue Push Notifications (FCM) ---
    for (const task of overdueTasks) {
      console.log(`[TaskReminder] Processing overdue alert for task: ${task.title} (ID: ${task.id})`);

      // Retrieve FCM subscription tokens for the task's user
      const fcmSnapshot = await db.collection('fcmTokens')
        .where('userId', '==', task.userId)
        .get();

      const tokens = [];
      fcmSnapshot.forEach(tokenDoc => {
        const tokenData = tokenDoc.data();
        if (tokenData.token) tokens.push(tokenData.token);
      });

      if (tokens.length > 0) {
        const payload = {
          notification: {
            title: 'Task Overdue!',
            body: `${task.title} ka time complete ho gaya!`,
          },
          data: {
            taskId: task.id,
            action: 'open_task_app',
            click_action: 'FLUTTER_NOTIFICATION_CLICK', // Opens browser window / app
          }
        };

        // Send push notification to all retrieved user devices
        for (const token of tokens) {
          try {
            await admin.messaging().send({
              token,
              notification: payload.notification,
              data: payload.data,
              webpush: {
                fcmOptions: {
                  link: '/' // Opens the app home path
                }
              }
            });
            console.log(`[FCM] Push sent successfully to token of user: ${task.userId}`);
          } catch (err) {
            console.error(`[FCM] Error sending push to token:`, err);
            // Optional: Remove dead tokens
            if (err.code === 'messaging/invalid-registration-token' || err.code === 'messaging/registration-token-not-registered') {
              const deadTokenDocs = await db.collection('fcmTokens').where('token', '==', token).get();
              deadTokenDocs.forEach(deadDoc => deadDoc.ref.delete());
            }
          }
        }
      } else {
        console.log(`[FCM] No registered FCM push tokens found for user: ${task.userId}`);
      }

      // Mark task as notified to prevent repeating push alerts
      await db.collection('tasks').doc(task.id).update({
        notified: true
      });
    }

    // --- Processing 2: Email Warning (Approaching Deadline) ---
    if (approachingTasks.length > 0) {
      // Lazy configuration for Nodemailer
      const mailConfig = {
        service: 'gmail', // Standard configuration preset
        auth: {
          user: process.env.SMTP_EMAIL || 'rapid.reminder.service@gmail.com',
          pass: process.env.SMTP_PASSWORD || '' // Admin configured secret
        }
      };

      if (process.env.SMTP_PASSWORD) {
        const transporter = nodemailer.createTransport(mailConfig);

        for (const task of approachingTasks) {
          try {
            // Retrieve user email/meta from authentication records
            const userRecord = await admin.auth().getUser(task.userId);
            const userEmail = userRecord.email;

            if (userEmail) {
              const htmlContent = `
                <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                  <h2 style="color: #475569;">⏰ Reminder: Task Deadline Approaching</h2>
                  <p>Hello,</p>
                  <p>Your scheduled task <strong>"${task.title}"</strong> is due in 30 minutes.</p>
                  <p><strong>Deadline:</strong> ${task.dueDate.toLocaleString()}</p>
                  ${task.description ? `<p><strong>Details:</strong> ${task.description}</p>` : ''}
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #94a3b8;">This is an automated notification from Rapid Reminder Scheduler.</p>
                </div>
              `;

              await transporter.sendMail({
                from: `"FinTrack Reminders" <${mailConfig.auth.user}>`,
                to: userEmail,
                subject: `⏰ 30 Minutes Left: ${task.title}`,
                html: htmlContent
              });

              console.log(`[Email] Warning sent to ${userEmail} for task "${task.title}"`);
            }

            // Mark task as emailed
            await db.collection('tasks').doc(task.id).update({
              emailSent: true
            });
          } catch (mailError) {
            console.error(`[Email] Error preparing or sending reminder mail:`, mailError);
          }
        }
      } else {
        console.log('[Email] Skipped email sending. SMTP_PASSWORD is not configured in Cloud Function environment.');
        // Still update emailSent to true so it doesn't get repeatedly processed
        for (const task of approachingTasks) {
          await db.collection('tasks').doc(task.id).update({
            emailSent: true
          });
        }
      }
    }

  } catch (error) {
    console.error('[TaskReminder] Scheduler error:', error);
  }
});
