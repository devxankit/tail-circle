import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Web Speech API Voice Search
 */
export function useVoiceSearch({ onResult, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);

  // Store latest callback references to prevent re-initializing recognition on parent re-renders
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      if (onResultRef.current) {
        onResultRef.current(currentTranscript);
      }
    };

    recognition.onerror = (event) => {
      // Ignore 'aborted' as it's triggered when manually stopped or re-initialized
      if (event.error === 'aborted') {
        setIsListening(false);
        return;
      }
      console.warn('Voice search error:', event.error);
      setIsListening(false);
      let errMsg = 'Voice recognition failed';
      if (event.error === 'not-allowed') {
        errMsg = 'Microphone access denied. Please allow microphone permissions in your browser.';
      } else if (event.error === 'no-speech') {
        errMsg = 'No speech detected. Please try speaking again.';
      } else if (event.error === 'audio-capture') {
        errMsg = 'No microphone found. Please ensure a microphone is connected.';
      }
      setError(errMsg);
      if (onErrorRef.current) onErrorRef.current(errMsg);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const msg = 'Voice search is not supported in this browser.';
      setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to start speech recognition:', e);
        }
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    setError
  };
}
