package com.physiosuai.app;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin wrapper for BackgroundAudioService.
 * JS calls: BackgroundAudio.start({title, artist}) / BackgroundAudio.stop()
 */
@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String title  = call.getString("title",  "Physio SUAI");
        String artist = call.getString("artist", "Playing music");

        Intent intent = new Intent(getActivity(), BackgroundAudioService.class);
        intent.putExtra("title",  title);
        intent.putExtra("artist", artist);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getActivity().startForegroundService(intent);
            } else {
                getActivity().startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start BackgroundAudioService: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getActivity(), BackgroundAudioService.class);
        try {
            getActivity().stopService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop BackgroundAudioService: " + e.getMessage());
        }
    }
}
