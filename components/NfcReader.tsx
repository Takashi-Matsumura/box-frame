"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Web USB API型拡張
declare global {
  interface Navigator {
    usb?: USB;
  }
  interface USB {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  }
  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }
  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
  }
  interface USBDevice {
    vendorId: number;
    productId: number;
  }
}

interface NfcReaderProps {
  onRead: (nfcId: string) => void;
  disabled?: boolean;
  mode?: "polling" | "button" | "keyboard";
  pollingInterval?: number;
  buttonText?: string;
  buttonLoadingText?: string;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "needs_pairing";

export function NfcReader({
  onRead,
  disabled,
  mode = "polling",
  pollingInterval = 500,
  buttonText = "NFCカードを読み取る",
  buttonLoadingText = "読み取り中...",
}: NfcReaderProps) {
  const [buffer, setBuffer] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [usbSupported, setUsbSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nfcModuleRef = useRef<typeof import("@/lib/nfc/rcs300-polling") | null>(null);
  const isInitializedRef = useRef(false);
  const onReadRef = useRef(onRead);
  const disabledRef = useRef(disabled);
  const pollingIntervalRef = useRef(pollingInterval);

  // 常に最新の値を参照
  useEffect(() => {
    onReadRef.current = onRead;
    disabledRef.current = disabled;
    pollingIntervalRef.current = pollingInterval;
  }, [onRead, disabled, pollingInterval]);

  // カード読み取りハンドラ
  const handleRead = useCallback((nfcId: string) => {
    if (!disabledRef.current) {
      onReadRef.current(nfcId);
    }
  }, []);

  // Web USB API サポートチェック
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.usb) {
      setUsbSupported(true);
    }
  }, []);

  // ポーリングモードの接続処理（refベースで一度だけ実行）
  const connectAndStartPolling = useCallback(async (allowPrompt: boolean = false) => {
    // 既に接続中または接続済みの場合はスキップ
    if (nfcModuleRef.current?.isConnected()) {
      console.log("Already connected, skipping");
      return;
    }

    try {
      setConnectionStatus("connecting");
      setErrorMessage(null);

      const nfcModule = await import("@/lib/nfc/rcs300-polling");
      nfcModuleRef.current = nfcModule;

      await nfcModule.connect(navigator, allowPrompt);

      setConnectionStatus("connected");

      // ポーリング開始
      nfcModule.startPolling(handleRead, pollingIntervalRef.current);
    } catch (error) {
      console.error("NFC初期化エラー:", error);

      if (error instanceof Error && error.message === "NO_PAIRED_DEVICE") {
        setConnectionStatus("needs_pairing");
        setErrorMessage(null);
      } else {
        setConnectionStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "接続に失敗しました"
        );
      }
    }
  }, [handleRead]);

  // ペアリングボタンのクリックハンドラ
  const handlePairingClick = useCallback(() => {
    connectAndStartPolling(true);
  }, [connectAndStartPolling]);

  // ポーリングモードの自動接続（一度だけ実行）
  useEffect(() => {
    if (mode !== "polling" || !usbSupported) return;
    if (isInitializedRef.current) return;

    isInitializedRef.current = true;

    // 自動接続を開始
    connectAndStartPolling(false);

    // バックグラウンド時にポーリングを停止/再開
    const handleVisibilityChange = () => {
      if (document.hidden && nfcModuleRef.current) {
        nfcModuleRef.current.stopPolling();
      } else if (!document.hidden && nfcModuleRef.current?.isConnected()) {
        nfcModuleRef.current.startPolling(handleRead, pollingIntervalRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // クリーンアップ（コンポーネントのアンマウント時のみ）
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (nfcModuleRef.current) {
        nfcModuleRef.current.disconnect();
        nfcModuleRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, [mode, usbSupported, connectAndStartPolling, handleRead]);

  // ボタンモード: クリックで1回読み取り
  const readFromUSB = useCallback(async () => {
    if (disabled) return;

    try {
      setConnectionStatus("connecting");
      const { getIDmStr } = await import("@/lib/nfc/rcs300");
      const idmStr = await getIDmStr(navigator);

      if (idmStr) {
        const formattedId = idmStr.replace(/\s+/g, "");
        handleRead(formattedId);
      }
      setConnectionStatus("disconnected");
    } catch (error) {
      console.error("NFC読み取りエラー:", error);
      setConnectionStatus("error");
    }
  }, [disabled, handleRead]);

  // キーボード入力（フォールバック/開発用）
  useEffect(() => {
    if (disabled || mode !== "keyboard") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Enter" && buffer.length > 0) {
        handleRead(buffer);
        setBuffer("");
        return;
      }

      if (/^[a-zA-Z0-9-]$/.test(e.key)) {
        setBuffer((prev) => prev + e.key);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setBuffer("");
        }, 500);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [buffer, disabled, handleRead, mode]);

  // 再接続処理
  const handleReconnect = useCallback(async () => {
    if (nfcModuleRef.current) {
      await nfcModuleRef.current.disconnect();
      nfcModuleRef.current = null;
    }
    setConnectionStatus("disconnected");
    setErrorMessage(null);

    // 少し待ってから再接続
    setTimeout(() => {
      connectAndStartPolling(false);
    }, 100);
  }, [connectAndStartPolling]);

  // ポーリングモードの状態表示
  if (mode === "polling" && usbSupported) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        {connectionStatus === "disconnected" && (
          <div className="bg-yellow-500 text-white py-2 px-4 text-center animate-pulse">
            NFCリーダーに接続中...
          </div>
        )}
        {connectionStatus === "connecting" && (
          <div className="bg-yellow-500 text-white py-2 px-4 text-center animate-pulse">
            NFCリーダーに接続中...
          </div>
        )}
        {connectionStatus === "needs_pairing" && (
          <div className="bg-gray-500 text-white py-2 px-4 text-center">
            NFCリーダーをペアリングしてください
            <button
              onClick={handlePairingClick}
              className="ml-4 px-3 py-1 bg-white text-gray-700 rounded text-sm hover:bg-gray-100"
            >
              ペアリング
            </button>
          </div>
        )}
        {connectionStatus === "connected" && (
          <div className="bg-orange-600 text-white py-2 px-4 text-center">
            NFCカードを読み取る
            <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        )}
        {connectionStatus === "error" && (
          <div className="bg-red-500 text-white py-2 px-4 text-center">
            {errorMessage || "接続エラー"}
            <button
              onClick={handleReconnect}
              className="ml-4 px-3 py-1 bg-white text-red-700 rounded text-sm hover:bg-gray-100"
            >
              再接続
            </button>
          </div>
        )}
      </div>
    );
  }

  // ボタンモードの場合
  if (mode === "button" && usbSupported) {
    return (
      <button
        onClick={readFromUSB}
        disabled={disabled || connectionStatus === "connecting"}
        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {connectionStatus === "connecting" ? buttonLoadingText : buttonText}
      </button>
    );
  }

  return null;
}
