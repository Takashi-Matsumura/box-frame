"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Web Speech API を使用した音声認識フック
 *
 * ## ブラウザサポート
 * - Chrome (Desktop/Android): フルサポート
 * - Safari (Desktop/iOS): フルサポート
 * - Firefox: 未サポート
 * - Edge: フルサポート
 *
 * ## 使用例
 * ```tsx
 * const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition({
 *   language: "ja-JP",
 *   onResult: (text) => setInput(text),
 * });
 * ```
 */

interface UseSpeechRecognitionOptions {
  /** 認識言語 (default: "ja-JP") */
  language?: string;
  /** 連続認識モード (default: false) */
  continuous?: boolean;
  /** 中間結果を取得 (default: true) */
  interimResults?: boolean;
  /** 認識結果のコールバック */
  onResult?: (transcript: string) => void;
  /** エラー時のコールバック */
  onError?: (error: string) => void;
  /** 認識終了時のコールバック */
  onEnd?: () => void;
}

interface UseSpeechRecognitionReturn {
  /** 音声認識がサポートされているか */
  isSupported: boolean;
  /** 現在リスニング中か */
  isListening: boolean;
  /** 認識されたテキスト */
  transcript: string;
  /** リスニング開始 */
  startListening: () => void;
  /** リスニング停止 */
  stopListening: () => void;
  /** トランスクリプトをクリア */
  clearTranscript: () => void;
}

// SpeechRecognition の型定義
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export function useSpeechRecognition({
  language = "ja-JP",
  continuous = false,
  interimResults = true,
  onResult,
  onError,
  onEnd,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // ブラウザサポートチェック
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);

        if (finalTranscript && onResult) {
          onResult(finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        if (onError) {
          onError(event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (onEnd) {
          onEnd();
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, onResult, onError, onEnd]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
  };
}

