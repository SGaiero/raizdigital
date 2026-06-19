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
    if (this.mode === "remote") {
      return `${this.backendUrl}${endpoint}`;
    }
    return `${this.baseUrl}${endpoint}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.mode === "remote") {
      headers.Authorization = `Bearer ${this.apiToken}`;
    }
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

  // Verificar conexión manual antes de forzarla
  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(this.getUrl("/health"));
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  // Auto-Discovery: Hace 2 pasadas escaneando la red por si el celular tarda en encontrarlo
  async autoDiscover(
    baseIpSegment: string = "192.168.1",
  ): Promise<string | null> {
    const checkIp = (ip: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 500); // Timeout rápido
        fetch(`http://${ip}/health`)
          .then((res) => {
            clearTimeout(timer);
            resolve(res.ok ? ip : null);
          })
          .catch(() => {
            clearTimeout(timer);
            resolve(null);
          });
      });
    };

    // 2 pasadas por la red
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 2; i <= 254; i += 20) {
        const batch = [];
        for (let j = 0; j < 20 && i + j <= 254; j++) {
          batch.push(checkIp(`${baseIpSegment}.${i + j}`));
        }
        const results = await Promise.all(batch);
        const found = results.find((ip) => ip !== null);

        if (found) {
          this.setLocalUrl(`http://${found}`);
          return found;
        }
      }
      // Pausa entre pasadas
      await new Promise((r) => setTimeout(r, 1000));
    }
    return null;
  }

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
    return {
      extractor: data.extractor ?? false,
      pump: data.pump ?? false,
    };
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
