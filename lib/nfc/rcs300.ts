// NFC リーダー RC-S300/RC-S380 用ライブラリ（ボタンモード）

import { deviceFilters, deviceModelList } from "./deviceConfig";
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

let deviceEp = {
  in: 0,
  out: 0,
};
let seqNumber = 0;

async function send300(device: USBDeviceExtended, data: number[]): Promise<void> {
  const argData = new Uint8Array(data);
  const dataLen = argData.length;
  const SLOTNUMBER = 0x00;
  const retVal = new Uint8Array(10 + dataLen);

  retVal[0] = 0x6b; // ヘッダー作成
  retVal[1] = 255 & dataLen; // length をリトルエンディアン
  retVal[2] = (dataLen >> 8) & 255;
  retVal[3] = (dataLen >> 16) & 255;
  retVal[4] = (dataLen >> 24) & 255;
  retVal[5] = SLOTNUMBER; // タイムスロット番号
  retVal[6] = ++seqNumber; // 認識番号

  if (dataLen !== 0) {
    retVal.set(argData, 10); // コマンド追加
  }

  await device.transferOut(deviceEp.out, retVal);
  await sleep(50);
}

async function receive(device: USBDeviceExtended, len: number): Promise<number[]> {
  const data = await device.transferIn(deviceEp.in, len);
  await sleep(10);
  const arr: number[] = [];
  for (let i = data.data.byteOffset; i < data.data.byteLength; i++) {
    arr.push(data.data.getUint8(i));
  }
  return arr;
}

async function session300(device: USBDeviceExtended): Promise<string | undefined> {
  const len = 50;

  await send300(device, [0xff, 0x56, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00]);
  await receive(device, len);

  await send300(device, [0xff, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00]);
  await receive(device, len);

  await send300(
    device,
    [0xff, 0x50, 0x00, 0x02, 0x04, 0x8f, 0x02, 0x03, 0x00, 0x00]
  );
  await receive(device, len);

  await send300(
    device,
    [
      0xff, 0x50, 0x00, 0x01, 0x00, 0x00, 0x11, 0x5f, 0x46, 0x04, 0xa0, 0x86,
      0x01, 0x00, 0x95, 0x82, 0x00, 0x06, 0x06, 0x00, 0xff, 0xff, 0x01, 0x00,
      0x00, 0x00, 0x00,
    ]
  );

  const polingResF = await receive(device, len);
  if (polingResF.length === 46) {
    const idm = polingResF.slice(26, 34).map((v) => dec2HexString(v));
    const idmStr = idm.join(" ");
    return idmStr;
  }

  return undefined;
}

export async function getIDmStr(nav: Navigator): Promise<string | undefined> {
  let device: USBDeviceExtended | undefined;

  // USBデバイスの選択と解放
  try {
    // ペアリング済みの対応デバイスが1つだったら、自動選択にする
    let pairedDevices = await nav.usb!.getDevices();
    pairedDevices = pairedDevices.filter((d) =>
      deviceFilters.map((p) => p.productId).includes(d.productId)
    );

    // 自動選択 or 選択画面
    device =
      pairedDevices.length === 1
        ? (pairedDevices[0] as unknown as USBDeviceExtended)
        : (await nav.usb!.requestDevice({ filters: deviceFilters }) as unknown as USBDeviceExtended);

    await device.open();
  } catch (e) {
    console.error("NFC device open error:", e);
    throw e;
  }

  try {
    await device.selectConfiguration(1);

    const interface1 = device.configuration.interfaces.filter(
      (v) => v.alternate.interfaceClass === 255
    )[0];
    await device.claimInterface(interface1.interfaceNumber);
    deviceEp = {
      in: interface1.alternate.endpoints.filter((e) => e.direction === "in")[0]
        .endpointNumber,
      out: interface1.alternate.endpoints.filter((e) => e.direction === "out")[0]
        .endpointNumber,
    };

    const idmStr = await session300(device);

    // 完了後にデバイスを閉じる
    try {
      await device.close();
    } catch {
      // デバイスクローズ時のエラーは無視
    }

    return idmStr;
  } catch (e) {
    console.error("NFC session error:", e);
    try {
      device.close();
    } catch {
      // デバイスクローズ時のエラーは無視
    }
    throw e;
  }
}
