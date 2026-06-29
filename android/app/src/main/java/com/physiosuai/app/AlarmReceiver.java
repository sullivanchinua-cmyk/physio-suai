package com.physiosuai.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * PHYSIO SUAI — AlarmReceiver
 *
 * Fires a high-priority alarm notification with the 1774 sound asset.
 * Wakes the screen if the device is idle.
 *
 * Place this file at:
 *   android/app/src/main/java/com/physiosuai/app/AlarmReceiver.java
 */
public class AlarmReceiver extends BroadcastReceiver {

    private static final String TAG              = "PhysioAlarmReceiver";
    private static final String CHANNEL_ALARMS   = "alarms";
    private static final String CHANNEL_MESSAGES = "messages";

    @Override
    public void onReceive(Context context, Intent intent) {
        String title   = intent.getStringExtra("title");
        String body    = intent.getStringExtra("body");
        int    alarmId = intent.getIntExtra("alarmId", (int)(System.currentTimeMillis() % 100000));

        Log.i(TAG, "Alarm fired: " + title);

        // Ensure notification channels exist (idempotent — Android deduplicates by channel ID,
        // but channels are immutable after first creation so sound/importance won't change here
        // if they were already created at app startup in MainActivity.onCreate).
        ensureChannels(context);

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        // ── Build tap intent ───────────────────────────────────────────────
        Intent tapIntent = new Intent(context, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tapIntent.putExtra("alarm_tap", true);
        PendingIntent pi = PendingIntent.getActivity(
            context, alarmId, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT |
            (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // ── Show notification ──────────────────────────────────────────────
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ALARMS)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title != null ? title : "Lecture Update")
            .setContentText(body != null ? body : "Tap to view")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setFullScreenIntent(pi, true); // heads-up on lock screen

        nm.notify(alarmId, builder.build());
    }

    /**
     * Create notification channels if they don't already exist.
     * Safe to call multiple times — Android deduplicates by channel ID.
     * ⚠️  Call this from MainActivity.onCreate() FIRST, before any notification
     * fires, so that the correct sound/importance is set on first creation.
     * Android makes channels immutable after first creation — if this ran
     * with wrong values on a previous install, uninstall the app to reset.
     */
    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        Uri alarmSound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/alarm_1774");
        AudioAttributes alarmAttrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        NotificationChannel alarmCh = new NotificationChannel(
            CHANNEL_ALARMS, "Lecture Alarms", NotificationManager.IMPORTANCE_HIGH
        );
        alarmCh.setDescription("Lecture update alarms");
        alarmCh.setSound(alarmSound, alarmAttrs);
        alarmCh.enableVibration(true);
        alarmCh.setVibrationPattern(new long[]{0, 500, 200, 500});
        nm.createNotificationChannel(alarmCh);

        Uri msgSound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/mixkit_positive_notification_951");
        AudioAttributes msgAttrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        NotificationChannel msgCh = new NotificationChannel(
            CHANNEL_MESSAGES, "Messages", NotificationManager.IMPORTANCE_HIGH
        );
        msgCh.setDescription("Chat message notifications");
        msgCh.setSound(msgSound, msgAttrs);
        msgCh.enableVibration(true);
        nm.createNotificationChannel(msgCh);
    }
}
