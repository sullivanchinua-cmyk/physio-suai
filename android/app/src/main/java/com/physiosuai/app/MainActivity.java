package com.physiosuai.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.physiosuai.app.AlarmReceiver;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        AlarmReceiver.ensureChannels(this);
    }
}
