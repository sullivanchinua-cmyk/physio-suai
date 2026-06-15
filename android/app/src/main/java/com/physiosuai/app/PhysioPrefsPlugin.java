package com.physiosuai.app;

import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin that persists alarm JSON into Android SharedPreferences
 * so BootReceiver can re-schedule them after a device reboot.
 *
 * JS: PhysioPrefs.setAlarmsJson({ json: "..." })
 *     PhysioPrefs.getAlarmsJson() -> { json: "..." }
 */
@CapacitorPlugin(name = "PhysioPrefs")
public class PhysioPrefsPlugin extends Plugin {

    private static final String PREFS_NAME = "physio_alarms";
    private static final String KEY_ALARMS = "alarms_json";

    @PluginMethod
    public void setAlarmsJson(PluginCall call) {
        String json = call.getString("json", "[]");
        SharedPreferences prefs = getActivity()
                .getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ALARMS, json).apply();
        call.resolve();
    }

    @PluginMethod
    public void getAlarmsJson(PluginCall call) {
        SharedPreferences prefs = getActivity()
                .getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
        String json = prefs.getString(KEY_ALARMS, "[]");
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
        ret.put("json", json);
        call.resolve(ret);
    }
}
