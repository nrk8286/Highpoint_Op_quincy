import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================================================

/**
 * On user creation, initialize profile and send welcome notification
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    const userRef = db.collection('users').doc(user.uid);
    await userRef.set({
      id: user.uid,
      email: user.email,
      displayName: user.displayName || 'New User',
      role: 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      preferences: {
        notifications: true,
        emailAlerts: true,
        theme: 'light'
      }
    });

    // Create welcome notification
    await db.collection('notifications').add({
      userId: user.uid,
      type: 'welcome',
      title: 'Welcome to HighPoint HouseKeep',
      message: 'Your account is ready. Start creating inspections and managing compliance.',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      icon: '👋'
    });

    await auth.setCustomUserClaims(user.uid, { role: 'user' });
    functions.logger.info(`User ${user.uid} created successfully`);
  } catch (error) {
    functions.logger.error(`Error creating user ${user.uid}:`, error);
  }
});

/**
 * Set user role with custom claims
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('authentication-required', 'Must be authenticated');
  }

  const { uid, role } = data;
  const allowedRoles = ['admin', 'supervisor', 'housekeeper', 'nurse', 'user'];

  if (!allowedRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }

  try {
    await auth.setCustomUserClaims(uid, { role });
    await db.collection('users').doc(uid).update({ role });
    return { success: true, message: `Role set to ${role}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to set role');
  }
});

// ============================================================================
// NOTIFICATIONS & ALERTS
// ============================================================================

/**
 * Send real-time notifications to users
 */
export const sendNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('authentication-required', 'Must be authenticated');
  }

  const { userId, title, message, type = 'info', icon = '📌' } = data;

  try {
    await db.collection('notifications').add({
      userId,
      title,
      message,
      type,
      icon,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

/**
 * Alert on critical compliance issues
 */
export const checkComplianceAlerts = functions.firestore
  .document('inspections/{inspectionId}')
  .onWrite(async (change, context) => {
    const inspection = change.after.data();
    if (!inspection) return;

    // Check if critical deficiencies exist
    const deficiencies = inspection.deficiencies || [];
    const criticalCount = deficiencies.filter((d: any) => d.severity === 'critical').length;

    if (criticalCount > 0) {
      await db.collection('notifications').add({
        userId: inspection.createdBy,
        type: 'alert',
        title: '🚨 Critical Deficiencies Found',
        message: `${criticalCount} critical issue(s) found in inspection. Immediate action required.`,
        inspectionId: context.params.inspectionId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// ============================================================================
// REPORTING & ANALYTICS
// ============================================================================

/**
 * Generate compliance report
 */
export const generateComplianceReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('authentication-required', 'Must be authenticated');
  }

  const { startDate, endDate, facilityId } = data;

  try {
    const inspectionsRef = db.collection('inspections')
      .where('facilityId', '==', facilityId)
      .where('createdAt', '>=', new Date(startDate))
      .where('createdAt', '<=', new Date(endDate));

    const snapshot = await inspectionsRef.get();
    const inspections = snapshot.docs.map(doc => doc.data());

    // Calculate metrics
    const totalInspections = inspections.length;
    const totalDeficiencies = inspections.reduce((sum, i) => sum + (i.deficiencies?.length || 0), 0);
    const averageScore = inspections.length > 0
      ? inspections.reduce((sum, i) => sum + (i.complianceScore || 0), 0) / inspections.length
      : 0;

    return {
      reportId: context.params.reportId || Math.random().toString(36).substr(2, 9),
      facilityId,
      period: { startDate, endDate },
      metrics: {
        totalInspections,
        totalDeficiencies,
        averageScore: Math.round(averageScore * 100) / 100,
        criticalDeficiencies: inspections.reduce((sum, i) =>
          sum + (i.deficiencies?.filter((d: any) => d.severity === 'critical').length || 0), 0
        )
      },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to generate report');
  }
});

/**
 * Calculate facility compliance score
 */
export const calculateFacilityScore = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('authentication-required', 'Must be authenticated');
  }

  const { facilityId } = data;

  try {
    const inspectionsRef = db.collection('inspections')
      .where('facilityId', '==', facilityId)
      .orderBy('createdAt', 'desc')
      .limit(10);

    const snapshot = await inspectionsRef.get();
    const inspections = snapshot.docs.map(doc => doc.data());

    const scores = inspections.map(i => i.complianceScore || 0);
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 0;
    const trend = scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0;

    await db.collection('facilities').doc(facilityId).update({
      complianceScore: Math.round(averageScore * 100) / 100,
      scoreTrend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      lastScoreUpdate: admin.firestore.FieldValue.serverTimestamp()
    });

    return { score: averageScore, trend };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to calculate score');
  }
});

// ============================================================================
// PHOTO & MEDIA MANAGEMENT
// ============================================================================

/**
 * Process inspection photos for compliance evidence
 */
export const processInspectionPhoto = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name || '';
    if (!filePath.includes('inspections/')) return;

    const [, inspectionId] = filePath.split('/');

    try {
      // Update inspection with photo metadata
      await db.collection('inspections').doc(inspectionId).update({
        hasPhotos: true,
        photoCount: admin.firestore.FieldValue.increment(1),
        lastPhotoUploadedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info(`Photo processed for inspection ${inspectionId}`);
    } catch (error) {
      functions.logger.error(`Error processing photo:`, error);
    }
  });

// ============================================================================
// SCHEDULING & AUTOMATION
// ============================================================================

/**
 * Schedule recurring inspections
 */
export const scheduleRecurringInspection = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('authentication-required', 'Must be authenticated');
  }

  const { facilityId, templateId, frequency, startDate } = data;

  try {
    const scheduleRef = await db.collection('inspectionSchedules').add({
      facilityId,
      templateId,
      frequency, // 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
      startDate: new Date(startDate),
      status: 'active',
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { scheduleId: scheduleRef.id, success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to schedule inspection');
  }
});

/**
 * Trigger scheduled inspections (run daily)
 */
export const triggerScheduledInspections = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    try {
      const schedules = await db.collection('inspectionSchedules')
        .where('status', '==', 'active')
        .get();

      for (const doc of schedules.docs) {
        const schedule = doc.data();
        // Create inspection based on schedule
        await db.collection('inspections').add({
          facilityId: schedule.facilityId,
          templateId: schedule.templateId,
          status: 'pending',
          scheduled: true,
          dueDate: new Date(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      functions.logger.info(`Triggered ${schedules.size} scheduled inspections`);
    } catch (error) {
      functions.logger.error('Error triggering scheduled inspections:', error);
    }
  });

// ============================================================================
// COMPLIANCE & AUDIT TRAILS
// ============================================================================

/**
 * Log all deficiency changes for audit trail
 */
export const logDeficiencyChange = functions.firestore
  .document('inspections/{inspectionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    const beforeDeficiencies = before?.deficiencies || [];
    const afterDeficiencies = after?.deficiencies || [];

    if (JSON.stringify(beforeDeficiencies) !== JSON.stringify(afterDeficiencies)) {
      await db.collection('auditLogs').add({
        inspectionId: context.params.inspectionId,
        changeType: 'deficiency_updated',
        before: beforeDeficiencies,
        after: afterDeficiencies,
        changedBy: 'system',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

/**
 * Mark overdue inspections
 */
export const markOverdueInspections = functions.pubsub
  .schedule('0 * * * *')
  .onRun(async () => {
    try {
      const now = new Date();
      const overdueRef = db.collection('inspections')
        .where('status', '==', 'pending')
        .where('dueDate', '<', now);

      const snapshot = await overdueRef.get();

      for (const doc of snapshot.docs) {
        await doc.ref.update({
          status: 'overdue',
          isOverdue: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      functions.logger.info(`Marked ${snapshot.size} inspections as overdue`);
    } catch (error) {
      functions.logger.error('Error marking overdue inspections:', error);
    }
  });
