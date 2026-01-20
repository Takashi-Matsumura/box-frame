// NFC デバイス設定

export interface DeviceFilter {
  vendorId: number;
  productId: number;
  deviceModel: number;
}

export const deviceFilters: DeviceFilter[] = [
  {
    vendorId: 0x054c,
    productId: 0x06c1,
    deviceModel: 380,
  },
  {
    vendorId: 0x054c,
    productId: 0x06c3,
    deviceModel: 380,
  },
  {
    vendorId: 0x054c,
    productId: 0x0dc8,
    deviceModel: 300,
  },
  {
    vendorId: 0x054c,
    productId: 0x0dc9,
    deviceModel: 300,
  },
];

export const deviceModelList: Record<number, number> = {
  0x06c1: 380,
  0x06c3: 380,
  0x0dc8: 300,
  0x0dc9: 300,
};
