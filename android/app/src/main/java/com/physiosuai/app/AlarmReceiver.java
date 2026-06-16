package com.physiosuai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * Fires when a scheduled lecture alarm triggers.
 * Plays alarm.mp3 at full volume + shows full-screen notification.
 * Works even when app is closed or screen is off.
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG            = "PhysioAlarmReceiver";
    private static final String ALARM_CHANNEL  = "physio_alarm_channel";
    private static final String NOTIF_CHANNEL  = "physio_suai_channel";
    private static final int    NOTIF_ID       = 7777;

    private static MediaPlayer _player;

    @Override
    public void onReceive(Context context, Intent intent) {
        int    alarmId = intent.getIntExtra("alarmId", 0);
        String title   = intent.getStringExtra("alarmTitle");
        String body    = intent.getStringExtra("alarmBody");
        String page    = intent.getStringExtra("page");
        if (title == null) title = "Lecture Alarm";
        if (body  == null) body  = "Your lecture is starting now!";
        if (page  == null) page  = "";

        Log.d(TAG, "Alarm fired: " + title);

        // Wake the device screen
        PowerManager pm       = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = pm.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "PhysioSUAI:AlarmWakeLock"
        );
        wl.acquire(30000); // 30 seconds

        // Play alarm sound at full volume
        playAlarm(context);

        // Show full-screen notification
        showFullScreenNotification(context, alarmId, title, body, page);
    }

    private void playAlarm(Context context) {
        try {
            if (_player != null) { try { _player.stop(); _player.release(); } catch(Exception ignored){} }
            Uri alarmUri = Uri.parse("android.resource://" + context.getPackageName() + "/raw/alarm");
            _player = new MediaPlayer();
            _player.setDataSource(context, alarmUri);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                _player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            }
            _player.setVolume(1.0f, 1.0f);
            _player.setLooping(false);
            _player.prepare();
            _player.start();
            Log.d(TAG, "Alarm sound playing");
        } catch (Exception e) {
            Log.e(TAG, "Alarm sound error: " + e.getMessage());
        }
    }

    private void showFullScreenNotification(Context ctx, int alarmId, String title, String body, String page) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Alarm channel (max importance, alarm sound)
            if (nm.getNotificationChannel(ALARM_CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(
                    ALARM_CHANNEL, "Lecture Alarms", NotificationManager.IMPORTANCE_HIGH
                );
                ch.enableVibration(true);
                ch.setVibrationPattern(new long[]{0, 500, 200, 500});
                ch.setSound(
                    Uri.parse("android.resource://" + ctx.getPackageName() + "/raw/alarm"),
                    new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
                );
                nm.createNotificationChannel(ch);
            }
            // Chat channel
            if (nm.getNotificationChannel(NOTIF_CHANNEL) == null) {
                NotificationChannel ch2 = new NotificationChannel(
                    NOTIF_CHANNEL, "Physio SUAI Notifications", NotificationManager.IMPORTANCE_HIGH
                );
                ch2.enableVibration(true);
                ch2.setSound(
                    Uri.parse("android.resource://" + ctx.getPackageName() + "/raw/notification"),
                    new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build()
                );
                nm.createNotificationChannel(ch2);
            }
        }

        // Tap → open app
        Intent openIntent = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (openIntent != null && !page.isEmpty()) openIntent.putExtra("page", page);
        PendingIntent pi = PendingIntent.getActivity(
            ctx, alarmId, openIntent != null ? openIntent : new Intent(),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder nb = new NotificationCompat.Builder(ctx, ALARM_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setFullScreenIntent(pi, true)
            .setContentIntent(pi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", pi)
            .setOngoing(false);

        nm.notify(NOTIF_ID, nb.build());
    }
}
