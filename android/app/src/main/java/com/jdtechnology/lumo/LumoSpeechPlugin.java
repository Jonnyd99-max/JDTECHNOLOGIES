package com.jdtechnology.lumo;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(name = "LumoSpeech", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class LumoSpeechPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private boolean running = false;
    private boolean onDevice = false;
    private int generation = 0;
    private int failures = 0;
    private Runnable restartTask;

    private boolean hasOnDeviceRecognizer() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
            && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
    }

    @PluginMethod
    public void getAvailability(PluginCall call) {
        main.post(() -> {
            JSObject result = new JSObject();
            boolean local = hasOnDeviceRecognizer();
            result.put("available", local || SpeechRecognizer.isRecognitionAvailable(getContext()));
            result.put("onDevice", local);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        main.post(() -> {
            stopInternal();
            call.getData().put("generation", generation);
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                requestPermissionForAlias("microphone", call, "microphonePermissionResult");
            } else {
                begin(call);
            }
        });
    }

    @PermissionCallback
    private void microphonePermissionResult(PluginCall call) {
        main.post(() -> {
            if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
            else call.reject("Microphone permission was denied. Allow microphone access in Android Settings → Apps → JD Technology → Permissions, then retry.");
        });
    }

    private void begin(PluginCall call) {
        if (call.getInt("generation", -1) != generation) {
            call.reject("The voice request was cancelled. Tap Enable voice to retry.");
            return;
        }
        try {
            onDevice = hasOnDeviceRecognizer();
            if (!onDevice && !SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("No Android speech service is available. Enable a speech service or add actions manually.");
                return;
            }
            if (onDevice && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            } else {
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            }
            recognizer.setRecognitionListener(new Listener(generation));
            running = true;
            failures = 0;
            listen();
            call.resolve();
        } catch (Exception error) {
            stopInternal();
            call.reject("Android voice could not start. Check the installed speech service and microphone permission, then retry.");
        }
    }

    private void listen() {
        if (!running || recognizer == null) return;
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-GB");
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        recognizer.startListening(intent);
    }

    private void restart(int session, long delay) {
        if (restartTask != null) main.removeCallbacks(restartTask);
        restartTask = () -> {
            if (!running || generation != session) return;
            try { listen(); }
            catch (Exception error) { fail("Android voice could not reconnect. Tap Enable voice to retry.", true); }
        };
        main.postDelayed(restartTask, delay);
    }

    private void emitText(String event, Bundle results) {
        ArrayList<String> text = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (text != null && !text.isEmpty() && !text.get(0).trim().isEmpty()) {
            JSObject data = new JSObject();
            data.put("text", text.get(0));
            notifyListeners(event, data);
        }
    }

    private void fail(String message, boolean fatal) {
        if (fatal) stopInternal();
        JSObject data = new JSObject();
        data.put("message", message);
        data.put("fatal", fatal);
        notifyListeners("speechError", data);
    }

    private void stopInternal() {
        running = false;
        generation++;
        if (restartTask != null) main.removeCallbacks(restartTask);
        restartTask = null;
        if (recognizer != null) {
            SpeechRecognizer old = recognizer;
            recognizer = null;
            old.cancel();
            old.destroy();
        }
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        main.post(() -> { stopInternal(); call.resolve(); });
    }

    @Override
    protected void handleOnStop() {
        main.post(() -> {
            if (running) fail("Voice paused while the app was in the background. Tap Enable voice to resume.", true);
            else stopInternal();
        });
    }

    @Override
    protected void handleOnDestroy() { main.post(this::stopInternal); }

    private class Listener implements RecognitionListener {
        private final int session;
        Listener(int session) { this.session = session; }
        private boolean active() { return running && session == generation; }
        @Override public void onReadyForSpeech(Bundle params) {
            if (!active()) return;
            JSObject data = new JSObject();
            data.put("message", onDevice ? "On-device voice connected" : "Android speech service connected · may require internet");
            notifyListeners("speechStatus", data);
        }
        @Override public void onBeginningOfSpeech() { if (active()) failures = 0; }
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {} // Raw audio is never persisted.
        @Override public void onEndOfSpeech() {}
        @Override public void onPartialResults(Bundle results) { if (active()) emitText("partialTranscript", results); }
        @Override public void onResults(Bundle results) {
            if (!active()) return;
            failures = 0;
            emitText("finalTranscript", results);
            restart(session, 250);
        }
        @Override public void onEvent(int eventType, Bundle params) {}
        @Override public void onError(int error) {
            if (!active()) return;
            if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                fail("No speech detected. Speak when you are ready.", false);
                restart(session, 400);
                return;
            }
            boolean permission = error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS;
            boolean language = error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED || error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE;
            boolean fatal = permission || language || error == SpeechRecognizer.ERROR_AUDIO || ++failures >= 3;
            String message = permission ? "Microphone permission was revoked. Allow it in Android settings, then retry."
                : language ? "English (UK) speech recognition is unavailable. Install its language pack in your Android speech service, or add actions manually."
                : fatal ? "Android speech recognition stopped. Check your speech service and connection, then retry or add actions manually."
                : "Android voice paused. Trying to reconnect…";
            fail(message, fatal);
            if (!fatal) restart(session, 1000);
        }
    }
}
