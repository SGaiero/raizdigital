// Servicio para comunicarse con el ESP32
// Soporta conexión local (LAN) y remota (a través de backend en la nube)

export interface SensorData {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  waterTemp: number;
  ph: number;
  ec: number;
}

export interface ActuatorStatus {
  extractor: boolean;
  pump: boolean;
}

export type ActuatorKey = keyof ActuatorStatus;
export type ConnectionMode = "local" | "remote";

class ESP32Service {
  private baseUrl: string = "http://192.168.1.100";
  private backendUrl: string = "";
  private apiToken: string = "";
  private timeout: number = 5000;
  private mode: ConnectionMode = "local";

  // ── CANDADO PARA EVITAR DOBLE ESCANEO EN REACT STRICT MODE ──
  private isDiscovering: boolean = false;

  setLocalUrl(url: string) {
    const cleanUrl = url.trim().replace(/\/+$/, "");
    this.baseUrl = cleanUrl;
    this.mode = "local";
    console.log("ESP32 Service configurado a:", this.baseUrl);
  }

  setRemoteConnection(backendUrl: string, apiToken: string) {
    this.backendUrl = backendUrl;
    this.apiToken = apiToken;
    this.mode = "remote";
  }

  getMode(): ConnectionMode {
    return this.mode;
  }

  private getUrl(endpoint: string): string {
    if (this.mode === "remote") return `${this.backendUrl}${endpoint}`;
    return `${this.baseUrl}${endpoint}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.mode === "remote")
      headers.Authorization = `Bearer ${this.apiToken}`;
    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const response = await Promise.race([
      fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...((options.headers as Record<string, string>) || {}),
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), this.timeout),
      ),
    ]);
    return response as Response;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(this.getUrl("/health"));
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  // ── Auto-Discovery Protegido ──
  async autoDiscover(baseIpSegments: string[]): Promise<string | null> {
    // Si ya hay un escaneo corriendo en el fondo, ignoramos la petición para no saturar
    if (this.isDiscovering) return null;
    this.isDiscovering = true;

    try {
      const checkIp = async (ip: string): Promise<string | null> => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 900);

          const response = await fetch(`http://${ip}/health`, {
            signal: controller.signal,
            headers: { "Cache-Control": "no-cache" },
          });

          clearTimeout(timeoutId);
          return response.ok ? ip : null;
        } catch (error) {
          return null;
        }
      };

      for (const baseSegment of baseIpSegments) {
        console.log(`Escaneando red: ${baseSegment}.x`);

        for (let i = 2; i <= 254; i += 15) {
          const batch = [];
          for (let j = 0; j < 15 && i + j <= 254; j++) {
            batch.push(checkIp(`${baseSegment}.${i + j}`));
          }

          const results = await Promise.all(batch);
          const found = results.find((ip) => ip !== null);

          if (found) {
            this.setLocalUrl(`http://${found}`);
            return found;
          }
        }
      }
      return null;
    } finally {
      // Liberamos el candado al terminar
      this.isDiscovering = false;
    }
  }

  // ── RESTO DE LOS MÉTODOS IGUALES ──
  async getSensorData(): Promise<SensorData> {
    const response = await this.fetchWithTimeout(this.getUrl("/api/sensors"));
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return {
      soilMoisture: data.soilMoisturePct ?? 0,
      temperature: data.temperature ?? 0,
      humidity: data.humidity ?? 0,
      waterTemp: data.waterTemp ?? 0,
      ph: data.ph ?? 0,
      ec: data.ec ?? 0,
    };
  }

  async getActuatorStatus(): Promise<ActuatorStatus> {
    const response = await this.fetchWithTimeout(this.getUrl("/api/actuators"));
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return { extractor: data.extractor ?? false, pump: data.pump ?? false };
  }

  async toggleActuator(
    actuator: ActuatorKey,
    isActive: boolean,
  ): Promise<void> {
    const response = await this.fetchWithTimeout(
      this.getUrl(`/api/actuators/${actuator}`),
      { method: "POST", body: JSON.stringify({ isActive }) },
    );
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  }

  async updateSensorValue(sensor: string, value: number): Promise<void> {
    const response = await this.fetchWithTimeout(
      this.getUrl(`/api/sensors/${sensor}`),
      { method: "POST", body: JSON.stringify({ value }) },
    );
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(this.getUrl("/health"));
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const esp32Service = new ESP32Service();
