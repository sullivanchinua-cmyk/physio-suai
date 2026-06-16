package com.physiosuai.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import org.json.JSONObject;
import org.json.JSONArray;

/**
 * Reschedules all saved lecture alarms after device reboot.
 * Fired by BOOT_COMPLETED and MY_PACKAGE_REPLACED intents.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "PhysioBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        if (!action.equals(Intent.ACTION_BOOT_COMPLETED) &&
            !action.equals(Intent.ACTION_MY_PACKAGE_REPLACED) &&
            !action.equals("android.intent.action.QUICKBOOT_POWERON") &&
            !action.equals("com.htc.intent.action.QUICKBOOT_POWERON")) return;

        Log.d(TAG, "Boot completed — rescheduling alarms");
        rescheduleAlarms(context);
    }

    private void rescheduleAlarms(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("physio_alarms", Context.MODE_PRIVATE);
            String raw = prefs.getString("alarms_json", "[]");
            JSONArray alarms = new JSONArray(raw);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            long now = System.currentTimeMillis();
            int rescheduled = 0;

            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.getJSONObject(i);
                long fireAt = alarm.getLong("fireAt");
                int id      = alarm.getInt("id");
                String title = alarm.optString("title", "Lecture Alarm");
                String body  = alarm.optString("body",  "Your lecture is starting now!");

                if (fireAt <= now) continue; // past alarm, skip

                Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                alarmIntent.putExtra("alarmId",    id);
                alarmIntent.putExtra("alarmTitle", title);
                alarmIntent.putExtra("alarmBody",  body);
                alarmIntent.putExtra("page",       alarm.optString("page", ""));

                PendingIntent pi = PendingIntent.getBroadcast(
                    context, id, alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                try {
                    am.setAlarmClock(new AlarmManager.AlarmClockInfo(fireAt, pi), pi);
                } catch (SecurityException e) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
                }
                rescheduled++;
            }
            Log.d(TAG, "Rescheduled " + rescheduled + " alarms after boot");
        } catch (Exception e) {
            Log.e(TAG, "Failed to reschedule alarms: " + e.getMessage());
        }
    }
}
