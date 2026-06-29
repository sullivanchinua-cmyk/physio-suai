package com.physiosuai.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * PHYSIO SUAI — AlarmBootReceiver
 *
 * Re-registers all pending lecture alarms after the device reboots.
 * Alarms are stored in SharedPreferences as a JSON array by the JS bridge
 * via the Android native channel.
 *
 * Place this file at:
 *   android/app/src/main/java/com/physiosuai/app/AlarmBootReceiver.java
 */
public class AlarmBootReceiver extends BroadcastReceiver {

    private static final String TAG = "PhysioAlarmBoot";
    private static final String PREFS_NAME  = "PhysioAlarms";
    private static final String PREFS_KEY   = "pending_alarms";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) &&
            !"android.intent.action.QUICKBOOT_POWERON".equals(action)) return;

        Log.i(TAG, "Boot completed — restoring lecture alarms");

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(PREFS_KEY, "[]");

        try {
            JSONArray alarms = new JSONArray(json);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.getJSONObject(i);
                long fireAt  = alarm.getLong("fireAt");
                int  alarmId = alarm.getInt("id");
                String title = alarm.optString("title", "Lecture Update");
                String body  = alarm.optString("body", "A lecture update is ready");

                if (fireAt <= System.currentTimeMillis()) continue; // already past

                Intent fireIntent = new Intent(context, AlarmReceiver.class);
                fireIntent.putExtra("title", title);
                fireIntent.putExtra("body", body);
                fireIntent.putExtra("alarmId", alarmId);

                PendingIntent pi = PendingIntent.getBroadcast(
                    context, alarmId, fireIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT |
                    (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0)
                );

                // API 31+: must check canScheduleExactAlarms() before setExactAndAllowWhileIdle()
                // If permission not granted, use inexact alarm as fallback (fires within ~15 min window).
                if (Build.VERSION.SDK_INT >= 31) {
                    if (am.canScheduleExactAlarms()) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
                    } else {
                        // Exact alarm permission not granted — use inexact; remind user in notification
                        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
                        Log.w(TAG, "Exact alarm permission not granted — alarm #" + alarmId + " scheduled inexactly");
                    }
                } else if (Build.VERSION.SDK_INT >= 23) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, fireAt, pi);
                }

                Log.i(TAG, "Restored alarm #" + alarmId + " for " + title);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to restore alarms: " + e.getMessage());
        }
    }

    /**
     * Called from JS bridge via Android channel to save an alarm persistently.
     */
    public static void saveAlarm(Context ctx, int id, long fireAt, String title, String body) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(PREFS_KEY, "[]");
        try {
            JSONArray arr = new JSONArray(json);
            JSONObject obj = new JSONObject();
            obj.put("id", id);
            obj.put("fireAt", fireAt);
            obj.put("title", title);
            obj.put("body", body);
            arr.put(obj);
            prefs.edit().putString(PREFS_KEY, arr.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "saveAlarm failed: " + e.getMessage());
        }
    }
}
