const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const AUTH_FOLDER = path.join(__dirname, 'auth_info');
const QR_IMG_PATH = path.join(__dirname, 'qr.png');
const PYTHON_PATH = '/home/rodrigo47363/telegram_remote/venv/bin/python';

let fehProcess = null;
let isProcessingAI = false;
const sentMessageIds = new Set();

function displayQrImage(qrString) {
    const pyScript = `import qrcode, sys; img=qrcode.make(sys.argv[1]); img.save('${QR_IMG_PATH}')`;
    const gen = spawn(PYTHON_PATH, ['-c', pyScript, qrString]);
    gen.on('close', (code) => {
        if (code === 0 && fs.existsSync(QR_IMG_PATH)) {
            if (fehProcess) {
                try { fehProcess.kill(); } catch (e) {}
            }
            fehProcess = spawn('feh', ['--scale-down', '-g', '520x520', '-T', 'WhatsApp QR - Escanea desde tu teléfono', QR_IMG_PATH], {
                env: { ...process.env, DISPLAY: ':0' },
                detached: true,
                stdio: 'ignore'
            });
            fehProcess.unref();
        }
    });
}

function closeQrImage() {
    if (fehProcess) {
        try { fehProcess.kill(); } catch (e) {}
        fehProcess = null;
    }
    exec('pkill -f "WhatsApp QR"', () => {});
}

async function safeSendMessage(sock, jid, content, options = {}) {
    try {
        const res = await sock.sendMessage(jid, content, options);
        if (res && res.key && res.key.id) {
            sentMessageIds.add(res.key.id);
            if (sentMessageIds.size > 2000) {
                const first = sentMessageIds.values().next().value;
                sentMessageIds.delete(first);
            }
        }
        return res;
    } catch (err) {
        console.error('[!] Error en safeSendMessage:', err);
    }
}

async function sendChunked(sock, jid, text, quoted) {
    const maxLen = 3800;
    if (text.length <= maxLen) {
        await safeSendMessage(sock, jid, { text }, { quoted });
        return;
    }
    for (let i = 0; i < text.length; i += maxLen) {
        const chunk = text.substring(i, i + maxLen);
        await safeSendMessage(sock, jid, { text: chunk }, { quoted });
    }
}

async function queryAntigravity(promptText, useContinuous = true) {
    return new Promise((resolve) => {
        const args = useContinuous ? ['-c', '-p', promptText] : ['-p', promptText];
        const child = spawn('agy', args, {
            env: {
                ...process.env,
                PATH: process.env.PATH + ':/home/rodrigo47363/.gemini/antigravity-cli/bin:/usr/local/bin:/usr/bin'
            }
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });

        child.on('close', (code) => {
            if (code !== 0 && !stdout) {
                resolve(`⚠️ Error de Antigravity (código ${code}):\n${stderr || 'Sin detalles'}`);
            } else {
                resolve(stdout.trim() || 'Respuesta vacía recibida.');
            }
        });

        child.on('error', (err) => {
            resolve(`⚠️ Error ejecutando Antigravity: ${err.message}`);
        });

        setTimeout(() => {
            try { child.kill(); } catch (e) {}
            if (!stdout) resolve('⏱️ Timeout: Antigravity tardó más de 90 segundos en generar la respuesta.');
        }, 90000);
    });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Parrot-Antigravity', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n[!] Nuevo código QR generado. Mostrando en pantalla...');
            qrcode.generate(qr, { small: true });
            displayQrImage(qr);
        }

        if (connection === 'close') {
            closeQrImage();
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('[!] Conexión cerrada. Reconectando:', shouldReconnect);
            if (shouldReconnect) {
                setTimeout(startBot, 3000);
            }
        } else if (connection === 'open') {
            closeQrImage();
            console.log('\n[✅] ¡WHATSAPP VINCULADO CORRECTAMENTE CON ANTIGRAVITY!');
            console.log('[*] Ahora puedes chatear libremente o usar comandos tácticos.');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message) continue;

            // PREVENCIÓN DE BUCLE: Ignorar mensajes generados por el bot
            if (msg.key && msg.key.id && sentMessageIds.has(msg.key.id)) {
                continue;
            }

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!text || !text.trim()) continue;

            const from = msg.key.remoteJid;
            const cleanText = text.trim();

            // Filtro defensivo contra mensajes de estado del propio bot
            if (cleanText.startsWith('⏳ Antigravity') || 
                cleanText.startsWith('📊 *ESTADO') || 
                cleanText.startsWith('🧠 *ANTIGRAVITY') || 
                cleanText.startsWith('📸 Captura') || 
                cleanText.startsWith('🔄 Reiniciando') || 
                cleanText.startsWith('✅ Memoria reiniciada') ||
                cleanText.startsWith('⚠️')) {
                continue;
            }

            console.log(`[+] Mensaje recibido de ${from}: ${cleanText}`);

            const lower = cleanText.toLowerCase();

            // 1. COMANDOS TÁCTICOS ESPECIALES
            if (lower === '!help') {
                const helpText = 
`🧠 *ANTIGRAVITY WHATSAPP AGENT* 🧠

*Chat Libre:*
• Puedes escribirme cualquier pregunta o mensaje directamente (ej. _"hola"_, _"explícame este comando"_, _"crea un script en python"_) y Antigravity te responderá.

*Comandos del Sistema:*
• *!status* - Telemetría de hardware, RAM y red
• *!screen* - Captura de pantalla de la laptop en tiempo real
• *!cmd <comando>* - Ejecutar comando Bash directo en terminal
• *!reset* - Reiniciar la memoria de conversación
• *!help* - Mostrar este menú`;
                await safeSendMessage(sock, from, { text: helpText }, { quoted: msg });
                continue;
            }

            if (lower === '!status') {
                const totalMem = (os.totalmem() / (1024 ** 3)).toFixed(2);
                const freeMem = (os.freemem() / (1024 ** 3)).toFixed(2);
                const usedMem = (totalMem - freeMem).toFixed(2);
                const uptimeHours = (os.uptime() / 3600).toFixed(1);

                exec('ip -br addr show wlp0s20f3', (err, stdout) => {
                    const ipInfo = stdout ? stdout.trim() : '192.168.1.71';
                    const statusText = 
`📊 *ESTADO DEL SISTEMA*
• *Host:* ${os.hostname()}
• *RAM:* ${usedMem} GB / ${totalMem} GB
• *Uptime:* ${uptimeHours} horas
• *Red:* \`${ipInfo}\``;
                    safeSendMessage(sock, from, { text: statusText }, { quoted: msg });
                });
                continue;
            }

            if (lower === '!screen') {
                const screenPath = '/tmp/wa_screenshot.png';
                exec('DISPLAY=:0 scrot -z /tmp/wa_screenshot.png', async (err) => {
                    if (err || !fs.existsSync(screenPath)) {
                        await safeSendMessage(sock, from, { text: '⚠️ Error al capturar pantalla. Asegúrate de tener la sesión gráfica activa.' }, { quoted: msg });
                        return;
                    }
                    try {
                        const imageBuffer = fs.readFileSync(screenPath);
                        await safeSendMessage(sock, from, { 
                            image: imageBuffer, 
                            caption: `📸 Captura de pantalla: ${new Date().toLocaleTimeString()}` 
                        }, { quoted: msg });
                        fs.unlinkSync(screenPath);
                    } catch (e) {
                        await safeSendMessage(sock, from, { text: `Error al enviar imagen: ${e.message}` }, { quoted: msg });
                    }
                });
                continue;
            }

            if (lower === '!reset') {
                await safeSendMessage(sock, from, { text: '🔄 Reiniciando memoria de conversación de Antigravity...' }, { quoted: msg });
                await queryAntigravity("Iniciando nueva conversación.", false);
                await safeSendMessage(sock, from, { text: '✅ Memoria reiniciada. Puedes comenzar un nuevo tema.' }, { quoted: msg });
                continue;
            }

            if (lower.startsWith('!cmd ')) {
                const cmdToExec = cleanText.substring(5).trim();
                exec(cmdToExec, { timeout: 35000 }, async (error, stdout, stderr) => {
                    let output = stdout || stderr || '[Comando ejecutado sin salida en terminal]';
                    await sendChunked(sock, from, `\`\`\`\n${output}\n\`\`\``, msg);
                });
                continue;
            }

            // 2. CUALQUIER OTRO MENSAJE -> RESPUESTA DIRECTA DE ANTIGRAVITY (LLM)
            let prompt = cleanText;
            if (prompt.startsWith('!')) {
                prompt = prompt.substring(1).trim();
            }

            if (!prompt) continue;

            if (isProcessingAI) {
                // Silenciosamente ignorar mensajes repetidos mientras procesa, para no generar loops
                console.log(`[!] Omitiendo "${prompt}" porque ya hay una consulta en proceso.`);
                continue;
            }

            isProcessingAI = true;
            try {
                await sock.sendPresenceUpdate('composing', from);

                console.log(`[*] Enviando a Antigravity: "${prompt}"`);
                const aiResponse = await queryAntigravity(prompt, true);

                await sock.sendPresenceUpdate('paused', from);
                await sendChunked(sock, from, aiResponse, msg);
            } catch (err) {
                console.error('[!] Error consultando Antigravity:', err);
                await safeSendMessage(sock, from, { text: `⚠️ Error interno: ${err.message}` }, { quoted: msg });
            } finally {
                isProcessingAI = false;
            }
        }
    });
}

startBot().catch(console.error);
