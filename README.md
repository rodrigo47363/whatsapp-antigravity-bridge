# WhatsApp Antigravity Bridge 🛰️⚡

Puente táctico de control remoto y asistente de inteligencia artificial para **WhatsApp**, integrando la librería `@whiskeysockets/baileys` con el motor conversacional de **Google Antigravity CLI** (`agy`) en entornos Linux (optimizado para **Parrot OS** / Debian).

---

## 🚀 Características Principales

* **Asistente de IA Autónomo:** Respuestas fluidas con contexto conversacional continuo (`agy -c -p`) directamente desde cualquier chat autorizado de WhatsApp.
* **Control Remoto del Sistema:** Ejecución directa de comandos en la terminal Linux vía `!cmd <comando>` con captura de `stdout` y `stderr`.
* **Telemetría de Hardware:** Consulta instantánea de estado del host, uso de memoria RAM, Uptime y dirección IP de interfaz con `!status`.
* **Captura de Pantalla en Tiempo Real:** Envío automático de capturas de la sesión gráfica (`DISPLAY=:0`) usando herramientas nativas (`scrot`) con `!screen`.
* **Arquitectura Ligera:** Construido sobre Baileys (WebSockets directos), sin dependencias de navegadores pesados ni Puppeteer.
* **Vinculación Gráfica y CLI:** Generación de código QR tanto en terminal como en ventana gráfica (`feh`) durante el primer emparejamiento.

---

## 🛠️ Requisitos Previos

* **Sistema Operativo:** Linux (Probado en Parrot Security OS / Debian / Arch).
* **Node.js:** Versión 18+ (v22 recomendada).
* **Antigravity CLI:** Instalado y configurado en el `PATH` (`agy`).
* **Paquetes del Sistema:**
  ```bash
  sudo apt update && sudo apt install -y scrot feh python3-qrcode
  ```

---

## 📦 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/rodrigo47363/whatsapp-antigravity-bridge.git
   cd whatsapp-antigravity-bridge
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Otorgar permisos de ejecución al script de arranque:**
   ```bash
   chmod +x start_whatsapp.sh
   ```

---

## ⚙️ Uso y Ejecución

### Inicio Manual
```bash
./start_whatsapp.sh
```
O directamente con Node:
```bash
node index.js
```

Al iniciarse por primera vez, se mostrará un código QR en pantalla. Escanéalo desde tu aplicación de WhatsApp en **Dispositivos Vinculados**. Las credenciales se guardarán localmente en la carpeta protegida `auth_info/`.

---

## 🎮 Comandos Disponibles

| Comando | Descripción |
| :--- | :--- |
| `Mensaje de texto` | Cualquier texto normal es procesado y respondido por Antigravity manteniendo la memoria conversacional activa. |
| `!status` | Muestra estado del sistema: Uptime, RAM usada/total e IP activa de la máquina. |
| `!screen` | Captura la pantalla actual de la sesión gráfica y la envía como imagen al chat. |
| `!cmd <comando>` | Ejecuta un comando en la shell del sistema y devuelve la salida formateada. |
| `!reset` | Reinicia el contexto conversacional de Antigravity para iniciar un nuevo hilo. |
| `!help` | Muestra el menú de ayuda con los comandos soportados. |

---

## 🔒 Consideraciones de Seguridad

> [!WARNING]
> La carpeta `auth_info/` contiene las claves criptográficas y tokens de sesión de WhatsApp. **Bajo ninguna circunstancia debe subirse a repositorios públicos**. Este repositorio ya incluye un archivo `.gitignore` configurado estrictamente para evitar fugas de credenciales.

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE).
