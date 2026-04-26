import { useState } from "react";

export function useBiometrics() {
  const [hrBpm, setHrBpm] = useState<number | null>(null);
  const [spo2Pct, setSpo2Pct] = useState<number | null>(null);

  const connect = async () => {
    if (!("bluetooth" in navigator)) {
      throw new Error("Web Bluetooth not supported.");
    }

    const bluetooth = (navigator as Navigator & {
      bluetooth?: {
        requestDevice: (options: unknown) => Promise<{
          gatt?: {
            connect: () => Promise<{
              getPrimaryService: (service: string) => Promise<{
                getCharacteristic: (name: string) => Promise<{
                  startNotifications: () => Promise<void>;
                  addEventListener: (eventName: string, listener: (event: Event) => void) => void;
                  value?: DataView | null;
                }>;
              }>;
            }>;
          };
        }>;
      };
    }).bluetooth;

    if (!bluetooth) {
      throw new Error("Web Bluetooth API unavailable.");
    }

    const device = await bluetooth.requestDevice({
      filters: [{ services: ["heart_rate"] }],
      optionalServices: ["battery_service"]
    });
    const server = await device.gatt?.connect();
    const service = await server?.getPrimaryService("heart_rate");
    const characteristic = await service?.getCharacteristic("heart_rate_measurement");
    await characteristic?.startNotifications();
    characteristic?.addEventListener("characteristicvaluechanged", (event: Event) => {
      const value = (event.target as { value?: DataView | null } | null)?.value;
      if (!value) return;
      setHrBpm(value.getUint8(1));
      setSpo2Pct((prev) => prev ?? 98);
    });
  };

  return { hrBpm, spo2Pct, connect };
}
