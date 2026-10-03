package com.jdtechnology.lumo;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register before BridgeActivity builds the bridge.
        registerPlugin(LumoSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
