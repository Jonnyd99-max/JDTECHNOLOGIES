import { useEffect, useRef, useState } from "react";
import { AudioCaptureService } from "../services/audio/AudioCaptureService";
import { createTranscriptionProvider } from "../services/audio/createTranscriptionProvider";
import { ActionCaptureService } from "../services/lumo/ActionCaptureService";
import { DeterministicActionParser } from "../services/lumo/ActionParser";
import { useStore } from "../storage/AppStore";
import type { Action, Meeting, OrbState } from "../models";
export function useMeetingSession() {
  const store = useStore();
  const [meeting, setMeeting] = useState<Meeting>(
    () =>
      store.meetings.find((m) => m.status === "active") || {
        id: crypto.randomUUID(),
        name: "Untitled meeting",
        startedAt: new Date().toISOString(),
        actions: [],
        transcript: [],
        status: "active",
      },
  );
  const [state, setState] = useState<OrbState>("idle");
  const [partial, setPartial] = useState("");
  const [message, setMessage] = useState(
    "Enable voice or add actions manually.",
  );
  const [voice, setVoice] = useState(false);
  const current = useRef(meeting);
  const settings = useRef(store.settings);
  settings.current = store.settings;
  const save = useRef(store.saveMeeting);
  save.current = store.saveMeeting;
  const audio = useRef(new AudioCaptureService());
  const provider = useRef(createTranscriptionProvider());
  const captureBuffer = useRef(new ActionCaptureService());
  const mounted = useRef(true);
  const starting = useRef(false);
  const listening = useRef(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pulse = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const update = (next: Meeting) => {
    current.current = next;
    setMeeting(next);
    save.current(next);
  };
  const appendAction = (instruction: string) => {
    if (!instruction.trim()) return;
    const action = new DeterministicActionParser().parse(
      instruction.trim(),
      current.current.id,
    );
    action.confirmed = settings.current.autoConfirm;
    update({
      ...current.current,
      actions: [...current.current.actions, action],
    });
  };
  const capture = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const instruction = captureBuffer.current.flush();
    if (!instruction) {
      setState(listening.current ? "waiting" : "idle");
      setMessage(
        "No action instruction heard. Say “Lumo, James needs to check the schedule.”",
      );
      return;
    }
    // Persist synchronously before visual feedback so ending/closing cannot lose a pending action.
    appendAction(instruction);
    setState("processing");
    clearTimeout(pulse.current);
    pulse.current = setTimeout(() => {
      if (!mounted.current) return;
      setState("captured");
      setMessage("Action captured");
      pulse.current = setTimeout(() => {
        if (mounted.current && !captureBuffer.current.active) {
          setState(listening.current ? "waiting" : "idle");
          setMessage(
            listening.current
              ? "Listening for “Lumo”"
              : "Enable voice or add actions manually.",
          );
        }
      }, 1700);
    }, 350);
  };
  const onFinal = (text: string) => {
    if (!mounted.current || !text.trim()) return;
    update({
      ...current.current,
      transcript: [
        ...current.current.transcript,
        { id: crypto.randomUUID(), text, timestamp: new Date().toISOString() },
      ],
    });
    if (!settings.current.wakePhrase) return;
    const result = captureBuffer.current.accept(text);
    if (result.previous) appendAction(result.previous);
    if (captureBuffer.current.active) {
      clearTimeout(pulse.current);
      setState(captureBuffer.current.instruction ? "recording" : "wake");
      setMessage("Listening…");
      clearTimeout(timer.current);
      timer.current = setTimeout(
        capture,
        captureBuffer.current.instruction ? 2000 : 7000,
      );
    }
  };
  useEffect(() => {
    mounted.current = true;
    save.current(current.current);
    return () => {
      mounted.current = false;
      generation.current++;
      audio.current.stop();
      provider.current.stopListening();
      clearTimeout(timer.current);
      clearTimeout(pulse.current);
      const instruction = captureBuffer.current.flush();
      if (instruction) {
        const action = new DeterministicActionParser().parse(
          instruction,
          current.current.id,
        );
        action.confirmed = settings.current.autoConfirm;
        save.current({
          ...current.current,
          actions: [...current.current.actions, action],
        });
      }
    };
  }, []);
  const startVoice = async () => {
    if (starting.current || listening.current) return;
    starting.current = true;
    const requestGeneration = ++generation.current;
    setMessage("Connecting microphone…");
    try {
      if (!provider.current.available)
        throw new Error(
          "Speech recognition is unavailable here. Add actions manually, or use Chrome on Android.",
        );
      if (!provider.current.managesMicrophone) {
        await audio.current.start();
        // Recognition owns its own microphone. Release the permission probe.
        audio.current.stop();
      }
      if (!mounted.current || requestGeneration !== generation.current) {
        audio.current.stop();
        return;
      }
      await provider.current.startListening({
        onFinalTranscript: onFinal,
        onPartialTranscript: (text) => {
          if (!mounted.current) return;
          setPartial(text);
          if (
            text &&
            settings.current.wakePhrase &&
            captureBuffer.current.observePartial(text)
          ) {
            setState("recording");
            setMessage("Listening…");
            clearTimeout(timer.current);
            // Interim text is never persisted as an action; wait for a final event.
            timer.current = setTimeout(capture, 7000);
          }
        },
        onError: (error, fatal) => {
          if (!mounted.current) return;
          setMessage(error);
          if (fatal) {
            generation.current++;
            audio.current.stop();
            provider.current.stopListening();
            listening.current = false;
            setVoice(false);
            setState("error");
          }
        },
        onStatus: (status) => {
          if (mounted.current)
            setMessage(
              status === "Voice connected" ? "Listening for “Lumo”" : status,
            );
        },
      });
      if (!mounted.current || requestGeneration !== generation.current) {
        audio.current.stop();
        provider.current.stopListening();
        return;
      }
      listening.current = true;
      setVoice(true);
      setState("waiting");
      setMessage(
        settings.current.wakePhrase
          ? "Listening for “Lumo”"
          : "Transcribing · wake phrase disabled",
      );
    } catch (error) {
      if (!mounted.current || requestGeneration !== generation.current) return;
      audio.current.stop();
      provider.current.stopListening();
      listening.current = false;
      if (mounted.current) {
        setVoice(false);
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Voice could not start. Please retry.",
        );
      }
    } finally {
      starting.current = false;
    }
  };
  const stop = () => {
    generation.current++;
    audio.current.stop();
    provider.current.stopListening();
    listening.current = false;
    setVoice(false);
    setPartial("");
    clearTimeout(timer.current);
    clearTimeout(pulse.current);
    appendAction(captureBuffer.current.flush());
    setState("idle");
    setMessage("Voice paused. Add actions manually or resume voice.");
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden && listening.current) stopRef.current();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);
  return {
    meeting,
    state,
    partial,
    message,
    voice,
    startVoice,
    stop,
    simulate: onFinal,
    simulateWake: () => onFinal("Lumo take this action"),
    updateAction: (a: Action) =>
      update({
        ...current.current,
        actions: current.current.actions.some((old) => old.id === a.id)
          ? current.current.actions.map((old) => (old.id === a.id ? a : old))
          : [...current.current.actions, a],
      }),
    deleteAction: (id: string) =>
      update({
        ...current.current,
        actions: current.current.actions.filter((a) => a.id !== id),
      }),
    end: () => {
      stop();
      const done: Meeting = {
        ...current.current,
        status: "complete",
        endedAt: new Date().toISOString(),
        transcript: settings.current.keepTranscript
          ? current.current.transcript
          : [],
      };
      update(done);
      return done.id;
    },
  };
}
