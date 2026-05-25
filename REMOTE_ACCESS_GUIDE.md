# 🌐 Acceso Remoto al ESP32 - Guía de Despliegue

## Opciones de Conexión

### 1️⃣ **LOCAL** (Recomendado para home)

- Conectarse dentro de la misma red WiFi
- No requiere servidor externo
- Más rápido y seguro

### 2️⃣ **REMOTO** (Acceso desde cualquier parte)

- Conectarse desde cualquier ubicación
- Requiere backend en la nube
- Ideal para monitoreo a distancia

---

## 🚀 Despliegue del Backend Remoto

### Opción A: Railway (MÁS FÁCIL) ⭐

1. **Crear cuenta** en [railway.app](https://railway.app)

2. **Crear nuevo proyecto**
   - Click en "Create New"
   - Selecciona "Deploy from GitHub"

3. **Configurar variables de entorno**
   En Railway, ir a "Variables"

   ```
   PORT=5000
   ESP32_LOCAL_URL=http://192.168.1.100
   API_TOKEN=tu_token_super_secreto_123
   ```

4. **Deploy**
   - Tu URL será: `https://raiz-digital-xxxxxx.railway.app`

### Opción B: Heroku (Requiere tarjeta de crédito)

```bash
# 1. Instalar Heroku CLI
# 2. Desde la carpeta backend/
heroku login
heroku create raiz-digital-app
heroku config:set API_TOKEN="tu_token_secreto"
heroku config:set ESP32_LOCAL_URL="http://192.168.1.100"
git push heroku main
```

### Opción C: Vercel

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Desde la carpeta backend/
vercel
# Configurar variables en el dashboard
```

---

## 📱 Configurar en la App

1. **Ir a Settings (Engranaje)**
2. **Seleccionar "Remoto"**
3. **Ingresar:**
   - URL: `https://tu-app.railway.app`
   - Token: `tu_token_super_secreto_123`
4. **Probar conexión**

---

## 🔐 Seguridad

### ⚠️ IMPORTANTE:

- **NO publiques tu token** en GitHub
- **Cambia el token** regularmente
- **Usa HTTPS** siempre
- El ESP32 sigue siendo local (solo el backend es remoto)

### Recomendaciones:

```
✅ Token fuerte: raiz_digital_2024_xyz123abc
❌ Token débil: 12345 o tu_token

✅ Variables en .env
❌ Variables en el código

✅ HTTPS en producción
❌ HTTP en producción
```

---

## 🧪 Pruebas

### Test desde terminal:

```bash
# Testar backend
curl -H "Authorization: Bearer tu_token_secreto" \
  https://tu-app.railway.app/health

# Obtener sensores
curl -H "Authorization: Bearer tu_token_secreto" \
  https://tu-app.railway.app/api/sensors
```

---

## 🐛 Solución de Problemas

| Problema           | Solución                         |
| ------------------ | -------------------------------- |
| Conexión rechazada | Verifica token y URL             |
| Timeout            | ESP32 local sin conexión         |
| 401 Unauthorized   | Token incorrecto                 |
| 500 Server Error   | Backend no puede llegar al ESP32 |

---

## 📋 Arquitectura

```
Tu dispositivo (App)
        ↓
   Backend en Nube (Railway/Heroku)
        ↓
   Tu Red WiFi
        ↓
   ESP32 Local (192.168.1.100)
```

---

## 🎯 Siguiente Paso

Después de desplegar el backend:

1. Copia la URL
2. Abre la app
3. Ve a Settings
4. Selecciona "Remoto"
5. Ingresa URL y Token
6. ¡Listo! Ahora puedes controlar desde cualquier lugar 🚀
