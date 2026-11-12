import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";

import {
  speechAbort,
  speechRecognitionAvailable,
  speechRequestPermissions,
  speechStart,
  speechStop,
  subscribeSpeechEvent,
} from "../lib/speech";

interface Options {
  onTranscript: (text: string) => void;
  lang?: string;
}

export function useVoiceDictation({
  onTranscript,
  lang = "en-US",
}: Options) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const listeningRef = useRef(false);
  const startingRef = useRef(false);
  const sessionRef = useRef(0);
  const shouldCommitRef = useRef(false);
  const finalTextRef = useRef("");
  const interimTextRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const subscriptionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const cleanupSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach((remove) => remove());
    subscriptionsRef.current = [];
  }, []);

  const resetText = useCallback(() => {
    finalTextRef.current = "";
    interimTextRef.current = "";
    setInterim("");
  }, []);

  const start = useCallback(async () => {
    if (listeningRef.current || startingRef.current) return;
    startingRef.current = true;
    const session = ++sessionRef.current;

    try {
      if (!speechRecognitionAvailable()) {
        Alert.alert(
          "Voice input unavailable",
          "Voice input needs a development build with expo-speech-recognition. Run npx expo run:android or npx expo run:ios.",
        );
        return;
      }

      const granted = await speechRequestPermissions();
      if (session !== sessionRef.current) return;
      if (!granted) {
        Alert.alert(
          "Permission required",
          "Microphone and speech recognition access are needed to dictate your course prompt.",
        );
        return;
      }

      resetText();
      shouldCommitRef.current = true;
      cleanupSubscriptions();

      const removeResult = subscribeSpeechEvent("result", (event) => {
        const first = event.results?.[0];
        if (!first) return;

        if (event.isFinal) {
          finalTextRef.current = [finalTextRef.current, first.transcript]
            .filter(Boolean)
            .join(" ");
          interimTextRef.current = "";
        } else {
          interimTextRef.current = first.transcript;
        }

        setInterim(
          [finalTextRef.current, interimTextRef.current]
            .filter(Boolean)
            .join(" "),
        );
      });

      const removeEnd = subscribeSpeechEvent("end", () => {
        const transcript = [finalTextRef.current, interimTextRef.current]
          .filter(Boolean)
          .join(" ")
          .trim();

        listeningRef.current = false;
        setListening(false);
        resetText();
        cleanupSubscriptions();

        if (shouldCommitRef.current && transcript) {
          onTranscriptRef.current(transcript);
        }
        shouldCommitRef.current = false;
      });

      const removeError = subscribeSpeechEvent("error", (event) => {
        listeningRef.current = false;
        shouldCommitRef.current = false;
        setListening(false);
        resetText();
        cleanupSubscriptions();

        Alert.alert(
          "Voice input stopped",
          event.message || "Speech recognition ended unexpectedly.",
        );
      });

      subscriptionsRef.current = [removeResult, removeEnd, removeError];
      listeningRef.current = true;
      setListening(true);
      speechStart({
        lang,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });
    } catch (error) {
      if (session !== sessionRef.current) return;
      console.error("[useVoiceDictation] start failed:", error);
      listeningRef.current = false;
      shouldCommitRef.current = false;
      setListening(false);
      resetText();
      cleanupSubscriptions();
      Alert.alert(
        "Voice input unavailable",
        "Voice input needs a development build with expo-speech-recognition. Run npx expo run:android or npx expo run:ios.",
      );
    } finally {
      startingRef.current = false;
    }
  }, [cleanupSubscriptions, lang, resetText]);

  const stop = useCallback(() => {
    if (!listeningRef.current) return;
    shouldCommitRef.current = true;
    speechStop();
  }, []);

  const abort = useCallback(() => {
    sessionRef.current += 1;
    shouldCommitRef.current = false;
    listeningRef.current = false;
    setListening(false);
    resetText();
    cleanupSubscriptions();
    speechAbort();
  }, [cleanupSubscriptions, resetText]);

  const toggle = useCallback(() => {
    if (listeningRef.current) {
      stop();
      return;
    }
    void start();
  }, [start, stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && listeningRef.current) {
        shouldCommitRef.current = true;
        speechStop();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      shouldCommitRef.current = false;
      cleanupSubscriptions();
      speechAbort();
    };
  }, [cleanupSubscriptions]);

  return {
    listening,
    interim,
    start,
    stop,
    toggle,
    abort,
  };
}
