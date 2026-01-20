// NFC ユーティリティ関数

export async function sleep(msec: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, msec));
}

export function paddingZero(num: string | number, p: number): string {
  return ("0".repeat(p) + num).slice(-p);
}

export function dec2HexString(n: number): string {
  return paddingZero(n.toString(16).toUpperCase(), 2);
}

export function getHeaderLength(header: number[]): number {
  return (header[4] << 24) | (header[3] << 16) | (header[2] << 8) | header[1];
}
