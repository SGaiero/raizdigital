// Servicio para comunicarse con el ESP32
// Soporta conexión local (LAN) y remota (a través de backend en la nube)

export interface SensorData {
  soilMoisture: number;  // GPIO 32, ADC1 - Higrómetro (Potenciómetro 10k en PoC)
  light: number;         // GPIO 34, ADC1 - LDR (Potenciómetro 5k en PoC)
  temperature: number;   // GPIO 15 - DHT22 (temperatura del aire)
  humidity: number;      // GPIO 15 - DHT22 (humedad relativa del aire)
  waterTemp: number;     // GPIO 4  - DS18B20 (temperatura agua/sustrato)
}

export interface ActuatorStatus {
  lights: boolean;    // GPIO 16 - LED/Relé SSR Luces
  extractor: boolean; // GPIO 17 - LED/Relé SSR Extractor
  pump: boolean;      // GPIO 5  - LED/Relé SSR Bomba
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
    this.baseUrl = url;
    this.mode = "local";
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

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await Promise.race([
      fetch(url, { ...options, headers: { ...this.getHeaders(), ...(options.headers as Record<string, string> || {}) } }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), this.timeout),
      ),
    ]);
    return response as Response;
  }

  async getSensorData(): Promise<SensorData> {
    const response = await this.fetchWithTimeout(this.getUrl("/api/sensors"));
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return {
      soilMoisture: data.soilMoisture ?? 0,
      light: data.light ?? 0,
      temperature: data.temperature ?? 0,
      humidity: data.humidity ?? 0,
      waterTemp: data.waterTemp ?? 0,
    };
  }

  async getActuatorStatus(): Promise<ActuatorStatus> {
    const response = await this.fetchWithTimeout(this.getUrl("/api/actuators"));
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return {
      lights: data.lights ?? false,
      extractor: data.extractor ?? false,
      pump: data.pump ?? false,
    };
  }

  async toggleActuator(actuator: ActuatorKey, isActive: boolean): Promise<void> {
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
