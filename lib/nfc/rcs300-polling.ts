/**
 * RC-S300 NFC Reader - Polling Mode
 * 常時接続でカードを検知するポーリング実装
 */

import { deviceFilters } from "./deviceConfig";
import { sleep, dec2HexString } from "./utils";

// Web USB デバイスの型定義
interface USBDeviceExtended {
  productId: number;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  configuration: {
    interfaces: Array<{
      interfaceNumber: number;
      alternate: {
        interfaceClass: number;
        endpoints: Array<{
          direction: "in" | "out";
          endpointNumber: number;
        }>;
      };
    }>;
  };
}

interface USBInTransferResult {
  data: DataView;
}

interface USBOutTransferResult {
  status: string;
  bytesWritten: number;
}

interface DeviceEndpoints {
  in: number;
  out: number;
}

let device: USBDeviceExtended | null = null;
let deviceEp: DeviceEndpoints = { in: 0, out: 0 };
let seqNumber = 0;
let isPolling = false;
let isConnecting = false;
let isBusy = false; // USB操作の排他制御

/**
 * USB操作のロックを取得
 */
async function acquireLock(): Promise<void> {
  while (isBusy) {
    await sleep(10);
  }
  isBusy = true;
}

/**
 * USB操作のロックを解放
 */
function releaseLock(): void {
  isBusy = false;
}

/**
 * デバイスにコマンドを送信
 */
async function send300(
  localDevice: USBDeviceExtended,
  localEp: DeviceEndpoints,
  data: number[]
): Promise<void> {
  if (!localDevice) throw new Error("Device not connected");

  const argData = new Uint8Array(data);
  const dataLen = argData.length;
  const SLOTNUMBER = 0x00;
  const retVal = new Uint8Array(10 + dataLen);

  retVal[0] = 0x6b;
  retVal[1] = 255 & dataLen;
  retVal[2] = (dataLen >> 8) & 255;
  retVal[3] = (dataLen >> 16) & 255;
  retVal[4] = (dataLen >> 24) & 255;
  retVal[5] = SLOTNUMBER;
  retVal[6] = ++seqNumber;

  if (dataLen !== 0) retVal.set(argData, 10);

  await localDevice.transferOut(localEp.out, retVal);
  await sleep(50);
}

/**
 * デバイスからレスポンスを受信
 */
async function receive(
  localDevice: USBDeviceExtended,
  localEp: DeviceEndpoints,
  len: number
): Promise<number[]> {
  if (!localDevice) throw new Error("Device not connected");

  const data = await localDevice.transferIn(localEp.in, len);
  await sleep(10);

  const arr: number[] = [];
  for (let i = data.data.byteOffset; i < data.data.byteLength; i++) {
    arr.push(data.data.getUint8(i));
  }
  return arr;
}

/**
 * デバイスの初期化シーケンス
 */
async function initializeDevice(
  localDevice: USBDeviceExtended,
  localEp: DeviceEndpoints
): Promise<void> {
  const len = 50;

  await send300(localDevice, localEp, [0xff, 0x56, 0x00, 0x00]);
  await receive(localDevice, localEp, len);

  await send300(localDevice, localEp, [0xff, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00]);
  await receive(localDevice, localEp, len);

  await send300(localDevice, localEp, [0xff, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00]);
  await receive(localDevice, localEp, len);

  await send300(localDevice, localEp, [0xff, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00]);
  await receive(localDevice, localEp, len);

  await send300(localDevice, localEp, [0xff, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00]);
  await receive(localDevice, localEp, len);

  await send300(localDevice, localEp, [0xff, 0x50, 0x00, 0x02, 0x04, 0x8f, 0x02, 0x03, 0x00, 0x00]);
  await receive(localDevice, localEp, len);
}

/**
 * FeliCaカードのポーリング（1回）
 * @returns IDm文字列 or null
 */
async function pollOnce(): Promise<string | null> {
  // デバイスチェック
  if (!device || !isPolling) return null;

  try {
    await acquireLock();

    // ロック取得後に再度チェック
    if (!device || !isPolling) {
      releaseLock();
      return null;
    }

    const len = 50;

    await send300(device, deviceEp, [
      0xff, 0x50, 0x00, 0x01, 0x00, 0x00, 0x11, 0x5f, 0x46, 0x04, 0xa0, 0x86,
      0x01, 0x00, 0x95, 0x82, 0x00, 0x06, 0x06, 0x00, 0xff, 0xff, 0x01, 0x00,
      0x00, 0x00, 0x00,
    ]);

    const response = await receive(device, deviceEp, len);

    releaseLock();

    if (response.length === 46) {
      const idm = response.slice(26, 34).map((v) => dec2HexString(v));
      return idm.join("");
    }

    return null;
  } catch (error) {
    releaseLock();
    // デバイスが切断された場合はエラーログを抑制
    if (device) {
      console.error("Poll error:", error);
    }
    return null;
  }
}

/**
 * ペアリング済みデバイスがあるか確認
 */
export async function hasPairedDevice(nav: Navigator): Promise<boolean> {
  try {
    let pairedDevices = await nav.usb!.getDevices();
    pairedDevices = pairedDevices.filter((d) =>
      deviceFilters.map((p) => p.productId).includes(d.productId)
    );
    return pairedDevices.length > 0;
  } catch {
    return false;
  }
}

/**
 * デバイスに接続
 * @param nav - Navigator
 * @param allowPrompt - trueの場合、ペアリングダイアログを表示（ユーザー操作が必要）
 */
export async function connect(nav: Navigator, allowPrompt = false): Promise<boolean> {
  if (device) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  isConnecting = true;

  let localDevice: USBDeviceExtended | null = null;
  let localEp: DeviceEndpoints = { in: 0, out: 0 };

  try {
    // ペアリング済みデバイスを確認
    let pairedDevices = await nav.usb!.getDevices();
    pairedDevices = pairedDevices.filter((d) =>
      deviceFilters.map((p) => p.productId).includes(d.productId)
    );

    if (pairedDevices.length >= 1) {
      // ペアリング済みデバイスがあれば自動選択
      localDevice = pairedDevices[0] as unknown as USBDeviceExtended;
    } else if (allowPrompt) {
      // ユーザー操作で呼ばれた場合のみペアリングダイアログを表示
      localDevice = await nav.usb!.requestDevice({ filters: deviceFilters }) as unknown as USBDeviceExtended;
    } else {
      // ペアリング済みデバイスがなく、プロンプトも許可されていない
      isConnecting = false;
      throw new Error("NO_PAIRED_DEVICE");
    }

    await localDevice.open();
    await localDevice.selectConfiguration(1);

    const interface1 = localDevice.configuration.interfaces.filter(
      (v) => v.alternate.interfaceClass === 255
    )[0];

    await localDevice.claimInterface(interface1.interfaceNumber);

    localEp = {
      in: interface1.alternate.endpoints.filter((e) => e.direction === "in")[0].endpointNumber,
      out: interface1.alternate.endpoints.filter((e) => e.direction === "out")[0].endpointNumber,
    };

    // 初期化シーケンス（ローカル変数を使用）
    await initializeDevice(localDevice, localEp);

    // 成功したらグローバル変数に代入
    device = localDevice;
    deviceEp = localEp;

    isConnecting = false;
    return true;
  } catch (error) {
    // エラー時はローカルデバイスをクローズ
    if (localDevice) {
      try {
        await localDevice.close();
      } catch {
        // クローズエラーは無視
      }
    }
    isConnecting = false;
    throw error;
  }
}

/**
 * デバイスを切断
 */
export async function disconnect(): Promise<void> {
  // 先にポーリングを停止
  isPolling = false;
  isConnecting = false;

  if (device) {
    const localDevice = device;
    device = null; // 先にnullにして他の操作を防ぐ

    // ロックが解放されるまで待機
    while (isBusy) {
      await sleep(10);
    }

    try {
      await localDevice.close();
    } catch {
      // 切断エラーは無視
    }
  }
}

/**
 * ポーリングを開始
 * @param onCardDetected - カード検出時のコールバック (idmStr) => void
 * @param interval - ポーリング間隔（ミリ秒）
 */
export function startPolling(
  onCardDetected: (idmStr: string) => void,
  interval = 500
): void {
  if (isPolling) {
    return;
  }

  if (!device) {
    return;
  }

  isPolling = true;
  let lastDetectedId: string | null = null;
  let lastDetectedTime = 0;
  const DEBOUNCE_TIME = 2000; // 同じカードの再検知を防ぐ時間（ミリ秒）

  // ポーリングループ
  const runPolling = async () => {
    while (isPolling && device) {
      try {
        const idmStr = await pollOnce();

        if (idmStr && isPolling) {
          const now = Date.now();
          // デバウンス: 同じカードが短時間に連続検知されるのを防ぐ
          if (idmStr !== lastDetectedId || now - lastDetectedTime > DEBOUNCE_TIME) {
            lastDetectedId = idmStr;
            lastDetectedTime = now;
            onCardDetected(idmStr);
          }
        }
      } catch {
        // デバイスが切断された場合はループを終了
        if (!device || !isPolling) break;
      }

      // ポーリング間隔
      if (isPolling && device) {
        await sleep(interval);
      }
    }
  };

  runPolling();
}

/**
 * ポーリングを停止
 */
export function stopPolling(): void {
  isPolling = false;
}

/**
 * 接続状態を取得
 */
export function isConnected(): boolean {
  return device !== null;
}

/**
 * ポーリング状態を取得
 */
export function isPollingActive(): boolean {
  return isPolling;
}
