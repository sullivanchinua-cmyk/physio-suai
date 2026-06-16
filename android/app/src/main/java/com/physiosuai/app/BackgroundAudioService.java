package com.physiosuai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

/**
 * Foreground service that keeps the app alive when music is playing.
 * Prevents Android from killing the WebView audio context in background.
 */
public class BackgroundAudioService extends Service {
    private static final String CHANNEL_ID = "physio_bg_audio";
    private static final int    NOTIF_ID   = 8888;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title  = "Physio SUAI";
        String artist = "Playing music";
        if (intent != null) {
            if (intent.hasExtra("title"))  title  = intent.getStringExtra("title");
            if (intent.hasExtra("artist")) artist = intent.getStringExtra("artist");
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Background Music", NotificationManager.IMPORTANCE_LOW
                );
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        }

        Intent openIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, openIntent != null ? openIntent : new Intent(),
            PendingIntent.FLAG_IMMUTABLE
        );

        Notification notif = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText(artist)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pi)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .build();

        startForeground(NOTIF_ID, notif);
        return START_STICKY;
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        stopForeground(true);
        super.onDestroy();
    }
}
