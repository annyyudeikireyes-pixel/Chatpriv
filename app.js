"use strict";

/* =========================================================
   CHATPRIV — PROFESIONAL
   Chat en tiempo real · Reconexión · Participantes
   Historial del servidor · Notificaciones Push
========================================================= */

const CONFIG = {
    maxNombre: 30,
    maxNombreChat: 40,
    maxMensaje: 500,
    storageChats: "chatpriv_chats",
    storageUsuarios: "chatpriv_participantes_",
    reconnectDelay: 1000
};

let socket = null;
let codigoChatActual = "";
let nombreUsuarioActual = "";
let chatActual = null;
let registroServiceWorker = null;
let escribiendoTimeout = null;
let usuarioEstaEscribiendo = false;
let activandoNotificaciones = false;
let pantallaChatCreada = false;
let idsMensajesMostrados = new Set();

/* =========================================================
   ESTILOS
========================================================= */

function instalarEstilos() {
    if (document.getElementById("chatpriv-professional-css")) return;

    const css = document.createElement("style");
    css.id = "chatpriv-professional-css";

    css.textContent = `
        :root {
            color-scheme: dark;
            --bg: #0b1020;
            --panel: #121a30;
            --panel2: #192541;
            --border: rgba(173,190,235,.14);
            --text: #f3f6ff;
            --muted: #9eaccb;
            --primary: #7568ff;
            --cyan: #50d9ee;
            --green: #50dfad;
            --orange: #ffb36c;
            --red: #ff758c;
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            min-height: 100%;
            background: var(--bg);
        }

        body {
            color: var(--text);
            background:
                radial-gradient(ellipse at 10% 0%,
                    rgba(103,89,255,.18), transparent 42%),
                radial-gradient(ellipse at 100% 100%,
                    rgba(41,191,224,.08), transparent 38%),
                var(--bg);
            font-family: Inter, system-ui, -apple-system,
                BlinkMacSystemFont, "Segoe UI", sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        button, input { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
        button:disabled { opacity: .6; cursor: wait; }

        button:focus-visible, input:focus-visible {
            outline: 2px solid var(--cyan);
            outline-offset: 3px;
        }

        .app-shell {
            width: min(100% - 24px, 560px);
            margin: auto;
            padding: 28px 0;
        }

        .inicio, .nombre-screen {
            display: flex;
            flex-direction: column;
            gap: 22px;
        }

        .hero {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 8px 2px;
        }

        .logo-grande, .chat-logo, .loading-circle {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            width: 62px;
            height: 62px;
            border: 1px solid rgba(255,255,255,.15);
            border-radius: 21px;
            background: linear-gradient(145deg,#8375ff,#5147cf);
            box-shadow: 0 12px 32px rgba(100,83,255,.25);
            font-size: 29px;
        }

        h1, h2, p { margin-top: 0; }

        .hero h1, .nombre-screen h1 {
            margin-bottom: 5px;
            font-size: clamp(27px,7vw,36px);
            letter-spacing: -1px;
        }

        .hero p, .subtitle {
            margin-bottom: 0;
            color: var(--muted);
            line-height: 1.55;
        }

        .card {
            padding: 23px;
            border: 1px solid var(--border);
            border-radius: 24px;
            background: linear-gradient(145deg,rgba(24,35,62,.97),
                rgba(16,24,43,.97));
            box-shadow: 0 18px 50px rgba(0,0,0,.2);
        }

        .card-header {
            display: flex;
            gap: 13px;
            margin-bottom: 20px;
        }

        .icono-card {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            width: 45px;
            height: 45px;
            border-radius: 15px;
            background: rgba(117,104,255,.16);
            font-size: 22px;
        }

        .card h2, .section-title h2 {
            margin-bottom: 5px;
            font-size: 19px;
        }

        .card p, .section-title p {
            margin-bottom: 0;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.5;
        }

        label {
            display: block;
            margin: 15px 0 6px;
            color: #dce4ff;
            font-size: 14px;
            font-weight: 650;
        }

        .input, .message-input {
            display: block;
            width: 100%;
            min-height: 51px;
            padding: 13px 15px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: rgba(5,10,24,.5);
            color: var(--text);
            font-size: 16px;
        }

        .input { margin: 12px 0; }

        .input::placeholder, .message-input::placeholder {
            color: #7483a7;
        }

        .input:focus, .message-input:focus {
            border-color: #a69cff;
            outline: none;
            box-shadow: 0 0 0 3px rgba(117,104,255,.12);
        }

        .btn {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            min-height: 50px;
            margin-top: 12px;
            padding: 12px 16px;
            border: 1px solid transparent;
            border-radius: 14px;
            font-weight: 700;
            transition: transform .15s;
        }

        .btn:active, .copy-button:active, .send-button:active {
            transform: scale(.98);
        }

        .btn-primary {
            background: linear-gradient(115deg,#8172ff,#6152e8);
            color: white;
            box-shadow: 0 9px 24px rgba(100,83,255,.2);
        }

        .btn-secondary {
            border-color: rgba(132,121,255,.34);
            background: rgba(117,104,255,.1);
            color: #dcd8ff;
        }

        .btn-link {
            border-color: var(--border);
            background: transparent;
            color: var(--muted);
        }

        .separator {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 17px 0;
            color: #7180a1;
            font-size: 13px;
        }

        .separator::before, .separator::after {
            content: "";
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .mensaje {
            margin: 12px 0 0;
            color: var(--red);
            font-size: 14px;
        }

        .privacidad {
            padding: 14px 16px;
            border: 1px solid var(--border);
            border-radius: 15px;
            color: var(--muted);
            background: rgba(16,24,43,.65);
            font-size: 13px;
            line-height: 1.5;
        }

        .section-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 13px;
        }

        .badge-count {
            display: grid;
            place-items: center;
            min-width: 33px;
            height: 33px;
            padding: 0 9px;
            border-radius: 11px;
            background: rgba(117,104,255,.17);
            color: #a69cff;
            font-weight: 800;
        }

        .chat-list { display: grid; gap: 9px; }

        .saved-chat {
            display: flex;
            align-items: center;
            gap: 9px;
            min-width: 0;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: rgba(18,26,48,.8);
        }

        .saved-avatar, .participant-avatar {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            border-radius: 13px;
            background: linear-gradient(145deg,#343e72,#222c4c);
            font-weight: 800;
        }

        .saved-info, .participant-info {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 5px;
            min-width: 0;
        }

        .saved-info strong, .participant-info strong {
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .saved-info span, .participant-info span {
            color: var(--muted);
            font-size: 12px;
        }

        .saved-enter, .saved-delete {
            min-height: 37px;
            padding: 8px 10px;
            border: 1px solid var(--border);
            border-radius: 11px;
            background: var(--panel2);
            color: var(--text);
        }

        .saved-delete { color: #ff9aab; }

        .codigo-preview {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 18px 0;
            padding: 15px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: rgba(5,10,24,.4);
        }

        .codigo-preview span { color: var(--muted); }
        .codigo-preview strong { color: var(--cyan); letter-spacing: 2px; }

        .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            text-align: center;
        }

        .loading-screen h2 { margin: 22px 0 8px; }
        .loading-screen p { color: var(--muted); line-height: 1.5; }

        .loading-circle { animation: cp-float 1.7s ease-in-out infinite; }

        .loading-bar {
            width: 210px;
            height: 5px;
            overflow: hidden;
            margin-top: 15px;
            border-radius: 9px;
            background: var(--panel2);
        }

        .loading-bar span {
            display: block;
            width: 45%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg,var(--primary),var(--cyan));
            animation: cp-loading 1.2s ease-in-out infinite;
        }

        @keyframes cp-loading {
            from { transform: translateX(-110%); }
            to { transform: translateX(260%); }
        }

        @keyframes cp-float {
            50% { transform: translateY(-5px); }
        }

        .chat-app {
            display: flex;
            flex-direction: column;
            width: min(100%,920px);
            height: 100dvh;
            min-height: 480px;
            margin: 0 auto;
            overflow: hidden;
            border-right: 1px solid var(--border);
            border-left: 1px solid var(--border);
            background: rgba(11,16,32,.94);
        }

        .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 14px 17px;
            border-bottom: 1px solid var(--border);
            background: rgba(18,26,48,.96);
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 11px;
            min-width: 0;
        }

        .chat-logo {
            width: 46px;
            height: 46px;
            border-radius: 15px;
            font-size: 23px;
        }

        .chat-header h1 {
            margin: 0 0 5px;
            overflow-wrap: anywhere;
            font-size: 18px;
        }

        .connection-status {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--green);
            font-size: 12px;
        }

        .connection-status span { color: var(--green); }
        .connection-status.offline, .connection-status.offline span {
            color: var(--orange);
        }

        .header-button {
            flex-shrink: 0;
            min-height: 39px;
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: 11px;
            background: rgba(255,255,255,.04);
            color: #d8def2;
        }

        .chat-info {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            padding: 12px 15px;
            border-bottom: 1px solid var(--border);
        }

        .code-box {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 4px;
            min-width: 110px;
        }

        .code-box span { color: var(--muted); font-size: 11px; }
        .code-box strong { color: var(--cyan); letter-spacing: 2px; }

        .copy-button {
            min-height: 38px;
            padding: 8px 10px;
            border: 1px solid rgba(117,104,255,.28);
            border-radius: 11px;
            background: rgba(117,104,255,.11);
            color: #dedaff;
            font-size: 12px;
            font-weight: 700;
        }

        .participants {
            padding: 12px 15px;
            border-bottom: 1px solid var(--border);
            background: rgba(18,26,48,.42);
        }

        .participants-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            font-size: 12px;
            font-weight: 700;
        }

        .participants-title b { color: #a69cff; }

        .participants-list {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 2px;
        }

        .participant {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 0 0 auto;
            max-width: 190px;
            padding: 7px 9px 7px 7px;
            border: 1px solid var(--border);
            border-radius: 13px;
            background: rgba(5,10,24,.28);
        }

        .participant-avatar {
            width: 33px;
            height: 33px;
            border-radius: 10px;
            color: #e0dcff;
        }

        .participant-info { gap: 4px; }
        .participant-info strong { max-width: 120px; font-size: 12px; }
        .participant-info span {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 10px;
        }

        .participant-info i {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--green);
        }

        .participant.is-offline .participant-info i { background: var(--orange); }
        .participant.is-offline .participant-info span { color: var(--orange); }

        .messages {
            display: flex;
            flex: 1;
            flex-direction: column;
            gap: 13px;
            min-height: 0;
            overflow-y: auto;
            padding: 17px 15px;
            overscroll-behavior: contain;
            scrollbar-width: thin;
        }

        .message-row {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            max-width: 88%;
            align-self: flex-start;
            animation: cp-in .16s ease-out;
        }

        .message-row.mine {
            flex-direction: row-reverse;
            align-self: flex-end;
        }

        .message-avatar {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            width: 30px;
            height: 30px;
            border-radius: 10px;
            background: #27345b;
            color: #e0e5ff;
            font-size: 12px;
            font-weight: 800;
        }

        .message-content {
            display: flex;
            flex-direction: column;
            gap: 5px;
            min-width: 0;
        }

        .message-name { padding: 0 4px; color: var(--muted); font-size: 11px; }

        .message-row.mine .message-name,
        .message-row.mine .message-time { text-align: right; }

        .message-bubble {
            overflow-wrap: anywhere;
            padding: 11px 14px;
            border: 1px solid var(--border);
            border-radius: 17px 17px 17px 5px;
            background: #192541;
            line-height: 1.5;
            white-space: pre-wrap;
        }

        .message-row.mine .message-bubble {
            border-color: rgba(117,104,255,.35);
            border-radius: 17px 17px 5px 17px;
            background: linear-gradient(135deg,#6759e9,#5548c9);
            color: white;
        }

        .message-time { padding: 0 4px; color: #7e8caf; font-size: 10px; }

        .system-message {
            align-self: center;
            max-width: 95%;
            padding: 7px 12px;
            border: 1px solid var(--border);
            border-radius: 20px;
            background: rgba(18,26,48,.75);
            color: var(--muted);
            font-size: 11px;
            text-align: center;
        }

        .typing {
            min-height: 20px;
            padding: 0 18px;
            color: var(--cyan);
            font-size: 12px;
        }

        .message-form {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 11px 12px max(11px,env(safe-area-inset-bottom));
            border-top: 1px solid var(--border);
            background: rgba(18,26,48,.98);
        }

        .message-input {
            flex: 1;
            min-width: 0;
            min-height: 48px;
            margin: 0;
            border-radius: 14px;
        }

        .send-button {
            display: grid;
            place-items: center;
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            border: 0;
            border-radius: 14px;
            background: linear-gradient(145deg,#8172ff,#5c4de0);
            color: white;
            font-size: 22px;
        }

        .connection-banner {
            padding: 8px 12px;
            background: rgba(255,179,108,.1);
            color: #ffca91;
            font-size: 12px;
            text-align: center;
        }

        @keyframes cp-in {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (min-width:700px) {
            .chat-app {
                height: min(100dvh,1000px);
                min-height: 560px;
                margin: 18px auto;
                border: 1px solid var(--border);
                border-radius: 24px;
                box-shadow: 0 18px 50px rgba(0,0,0,.2);
            }
            body:has(.chat-app) { padding: 1px 18px; }
            .messages { padding: 24px; }
            .message-row { max-width: 75%; }
        }

        @media (max-width:390px) {
            .app-shell { width: calc(100% - 18px); padding: 20px 0; }
            .card { padding: 17px; }
            .chat-header { padding: 11px; }
            .chat-info { padding: 10px; }
            .copy-button { padding: 7px; font-size: 11px; }
            .messages { padding: 12px 9px; }
            .message-row { max-width: 94%; }
        }

        @media (prefers-reduced-motion:reduce) {
            *,*::before,*::after {
                animation-duration: .01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: .01ms !important;
            }
        }
    `;

    document.head.appendChild(css);
}

/* =========================================================
   UTILIDADES
========================================================= */

function escaparHTML(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}

function obtenerInicial(nombre) {
    return String(nombre || "?").trim().charAt(0).toUpperCase() || "?";
}

function normalizarNombre(nombre) {
    return String(nombre || "").trim().slice(0, CONFIG.maxNombre);
}

function generarCodigo() {
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let codigo = "";

    for (let i = 0; i < 5; i++) {
        codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
    }

    return codigo;
}

/* =========================================================
   SERVICE WORKER
========================================================= */

async function registrarServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;

    try {
        registroServiceWorker =
            await navigator.serviceWorker.register("/sw.js");

        await navigator.serviceWorker.ready;
        console.log("ChatPriv: Service Worker listo.");

        return registroServiceWorker;
    } catch (error) {
        console.warn("No se pudo registrar el Service Worker:", error);
        return null;
    }
}

/* =========================================================
   NOTIFICACIONES PUSH
========================================================= */

function convertirClaveVapid(clave) {
    if (typeof clave !== "string" || !clave.trim()) {
        throw new Error("No se recibió la clave pública VAPID.");
    }

    const padding = "=".repeat((4 - clave.length % 4) % 4);
    const base64 = (clave + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const datos = atob(base64);

    return Uint8Array.from(datos, letra => letra.charCodeAt(0));
}

async function activarNotificaciones() {
    if (activandoNotificaciones) return;

    if (!("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)) {
        alert("Este navegador no admite notificaciones Push.");
        return;
    }

    if (!codigoChatActual || !nombreUsuarioActual) {
        alert("Primero debes entrar a un chat.");
        return;
    }

    const boton = document.getElementById("btnNotificaciones");
    activandoNotificaciones = true;

    if (boton) {
        boton.disabled = true;
        boton.textContent = "Activando...";
    }

    try {
        if (Notification.permission === "denied") {
            throw new Error(
                "Las notificaciones están bloqueadas en los permisos del navegador."
            );
        }

        if (Notification.permission !== "granted") {
            const permiso = await Notification.requestPermission();

            if (permiso !== "granted") {
                throw new Error("No se concedió permiso para notificaciones.");
            }
        }

        const respuestaClave = await fetch("/api/push-public-key", {
            cache: "no-store"
        });

        const datosClave = await respuestaClave.json();

        if (!respuestaClave.ok || !datosClave.ok || !datosClave.publicKey) {
            throw new Error("No se pudo obtener la clave pública VAPID.");
        }

        const registro = await navigator.serviceWorker.ready;
        let suscripcion = await registro.pushManager.getSubscription();

        if (!suscripcion) {
            suscripcion = await registro.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertirClaveVapid(datosClave.publicKey)
            });
        }

        const respuesta = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subscription: suscripcion,
                codigo: codigoChatActual,
                nombre: nombreUsuarioActual
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
            throw new Error(resultado.error || "No se pudo guardar la suscripción.");
        }

        if (socket && socket.connected) {
            socket.emit("registrar_push", { subscription: suscripcion });
        }

        if (boton) boton.textContent = "✓ Notificaciones activadas";
        alert("¡Notificaciones de ChatPriv activadas!");
    } catch (error) {
        console.error("Error activando notificaciones:", error);

        if (boton) boton.textContent = "🔔 Activar notificaciones";
        alert(error.message || "No se pudieron activar las notificaciones.");
    } finally {
        activandoNotificaciones = false;
        if (boton) boton.disabled = false;
    }
}

async function mostrarNotificacion(datos) {
    if (!datos || !document.hidden) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (socket && datos.senderId === socket.id) return;

    try {
        const registro = registroServiceWorker ||
            await navigator.serviceWorker.ready;

        await registro.showNotification(
            "💬 " + String(datos.nombre || "ChatPriv"),
            {
                body: String(datos.texto || "Tienes un nuevo mensaje."),
                tag: "chatpriv-" + codigoChatActual,
                data: { url: "/", codigo: codigoChatActual }
            }
        );
    } catch (error) {
        console.warn("No se pudo mostrar la notificación:", error);
    }
}

/* =========================================================
   CHATS GUARDADOS
========================================================= */

function obtenerChatsGuardados() {
    try {
        const datos = JSON.parse(localStorage.getItem(CONFIG.storageChats));
        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
}

function guardarChats(chats) {
    try {
        localStorage.setItem(CONFIG.storageChats, JSON.stringify(chats));
    } catch (error) {
        console.warn("No se pudieron guardar los chats:", error);
    }
}

function guardarChat(codigo, nombre) {
    const chats = obtenerChatsGuardados();
    const existente = chats.find(chat => chat.codigo === codigo);

    if (existente) {
        existente.nombre = nombre;
    } else {
        chats.unshift({ codigo, nombre, fecha: Date.now() });
    }

    guardarChats(chats);
}

function eliminarChat(codigo) {
    guardarChats(obtenerChatsGuardados().filter(chat => chat.codigo !== codigo));
    mostrarInicio();
}

/* =========================================================
   PARTICIPANTES LOCALES
========================================================= */

function claveParticipantes() {
    return CONFIG.storageUsuarios + codigoChatActual;
}

function obtenerParticipantesGuardados() {
    if (!codigoChatActual) return [];

    try {
        const datos = JSON.parse(localStorage.getItem(claveParticipantes()));
        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
}

function guardarParticipantes(lista) {
    if (!codigoChatActual) return;

    try {
        localStorage.setItem(claveParticipantes(), JSON.stringify(lista));
    } catch (error) {
        console.warn("No se pudieron guardar los participantes:", error);
    }
}

function registrarParticipante(nombre, conectado, id = "") {
    nombre = normalizarNombre(nombre);
    if (!nombre || !codigoChatActual) return;

    const lista = obtenerParticipantesGuardados();

    let persona = lista.find(item =>
        (id && item.id && item.id === id) ||
        item.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase()
    );

    if (!persona) {
        persona = {
            nombre,
            id: id || "",
            conectado: Boolean(conectado),
            actualizado: Date.now()
        };
        lista.push(persona);
    } else {
        persona.nombre = nombre;
        persona.conectado = Boolean(conectado);
        if (id) persona.id = id;
        persona.actualizado = Date.now();
    }

    guardarParticipantes(lista);
    mostrarParticipantes();
}

function combinarParticipantesDelServidor(listaServidor) {
    if (!Array.isArray(listaServidor)) return;

    const lista = obtenerParticipantesGuardados();

    listaServidor.forEach(persona => {
        if (!persona || !persona.nombre) return;

        const nombre = normalizarNombre(persona.nombre);
        const id = String(persona.id || persona.socketId || "");

        let guardado = lista.find(item =>
            (id && item.id && item.id === id) ||
            item.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase()
        );

        if (!guardado) {
            guardado = {
                nombre,
                id,
                conectado: true,
                actualizado: Date.now()
            };
            lista.push(guardado);
        } else {
            guardado.nombre = nombre;
            guardado.conectado = true;
            if (id) guardado.id = id;
            guardado.actualizado = Date.now();
        }
    });

    guardarParticipantes(lista);
    mostrarParticipantes();
}

/* =========================================================
   INICIO
========================================================= */

function mostrarInicio() {
    pantallaChatCreada = false;

    document.body.innerHTML = `
        <main class="app-shell">
            <section class="inicio">
                <div class="hero">
                    <div class="logo-grande">💬</div>
                    <div>
                        <h1>ChatPriv</h1>
                        <p>Tu espacio privado para conversar en tiempo real.</p>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="icono-card">🔐</span>
                        <div>
                            <h2>Entra a tu conversación</h2>
                            <p>Escribe el código del chat que te compartieron.</p>
                        </div>
                    </div>

                    <input id="codigoChat" class="input" type="text"
                        maxlength="20" placeholder="Ejemplo: 23Y29"
                        autocomplete="off" aria-label="Código del chat">

                    <button id="btnEntrar" class="btn btn-primary" type="button">
                        Entrar al chat
                    </button>

                    <div class="separator"><span>o</span></div>

                    <button id="btnCrear" class="btn btn-secondary" type="button">
                        ✨ Crear nuevo chat
                    </button>

                    <p id="mensaje" class="mensaje" role="status"></p>
                </div>

                <section id="misChats"></section>

                <div class="privacidad">
                    🔒 Los chats guardados y la lista local de participantes
                    permanecen en este dispositivo.
                </div>
            </section>
        </main>
    `;

    document.getElementById("btnEntrar").addEventListener("click", () => {
        const codigo = document.getElementById("codigoChat")
            .value.trim().toUpperCase();

        if (!codigo) {
            mostrarMensajeInicio("Escribe el código del chat.");
            return;
        }

        mostrarPantallaNombre(codigo, false);
    });

    document.getElementById("btnCrear").addEventListener("click", () => {
        mostrarPantallaNombre(generarCodigo(), true);
    });

    document.getElementById("codigoChat").addEventListener("keydown", event => {
        if (event.key === "Enter") document.getElementById("btnEntrar").click();
    });

    mostrarChatsGuardados();
}

function mostrarMensajeInicio(texto) {
    const mensaje = document.getElementById("mensaje");
    if (mensaje) mensaje.textContent = texto;
}

function mostrarChatsGuardados() {
    const contenedor = document.getElementById("misChats");
    if (!contenedor) return;

    const chats = obtenerChatsGuardados();
    if (!chats.length) {
        contenedor.replaceChildren();
        return;
    }

    const titulo = document.createElement("div");
    titulo.className = "section-title";

    const bloqueTitulo = document.createElement("div");
    const h2 = document.createElement("h2");
    const p = document.createElement("p");

    h2.textContent = "Mis chats";
    p.textContent = "Tus conversaciones guardadas";
    bloqueTitulo.append(h2, p);

    const contador = document.createElement("span");
    contador.className = "badge-count";
    contador.textContent = String(chats.length);

    titulo.append(bloqueTitulo, contador);

    const lista = document.createElement("div");
    lista.className = "chat-list";

    chats.forEach(chat => {
        const fila = document.createElement("article");
        fila.className = "saved-chat";

        const avatar = document.createElement("div");
        avatar.className = "saved-avatar";
        avatar.textContent = "💬";

        const info = document.createElement("div");
        info.className = "saved-info";

        const nombre = document.createElement("strong");
        nombre.textContent = chat.nombre || "Mi chat";

        const codigo = document.createElement("span");
        codigo.textContent = "Código: " + chat.codigo;

        info.append(nombre, codigo);

        const entrar = document.createElement("button");
        entrar.className = "saved-enter";
        entrar.type = "button";
        entrar.textContent = "Entrar";
        entrar.addEventListener("click", () => {
            mostrarPantallaNombre(chat.codigo, false);
        });

        const eliminar = document.createElement("button");
        eliminar.className = "saved-delete";
        eliminar.type = "button";
        eliminar.textContent = "🗑️";
        eliminar.title = "Eliminar de este dispositivo";
        eliminar.addEventListener("click", () => eliminarChat(chat.codigo));

        fila.append(avatar, info, entrar, eliminar);
        lista.appendChild(fila);
    });

    contenedor.replaceChildren(titulo, lista);
}

/* =========================================================
   NOMBRE DEL USUARIO
========================================================= */

function mostrarPantallaNombre(codigo, esNuevo) {
    document.body.innerHTML = `
        <main class="app-shell">
            <section class="nombre-screen">
                <div class="logo-grande">👤</div>

                <div>
                    <h1>${esNuevo ? "Crea tu chat" : "Bienvenido al chat"}</h1>
                    <p class="subtitle">Elige el nombre que verán los participantes.</p>
                </div>

                <div class="card">
                    <label for="nombreUsuario">Tu nombre</label>
                    <input id="nombreUsuario" class="input" type="text"
                        maxlength="${CONFIG.maxNombre}" placeholder="Ejemplo: Alex"
                        autocomplete="nickname">

                    ${esNuevo ? `
                        <label for="nombreChat">Nombre del chat</label>
                        <input id="nombreChat" class="input" type="text"
                            maxlength="${CONFIG.maxNombreChat}"
                            placeholder="Ejemplo: Amigos" autocomplete="off">
                    ` : `
                        <div class="codigo-preview">
                            <span>Código del chat</span>
                            <strong>${escaparHTML(codigo)}</strong>
                        </div>
                    `}

                    <button id="btnContinuar" class="btn btn-primary" type="button">
                        Continuar
                    </button>

                    <button id="btnVolver" class="btn btn-link" type="button">
                        ← Volver
                    </button>
                </div>
            </section>
        </main>
    `;

    const inputNombre = document.getElementById("nombreUsuario");
    const boton = document.getElementById("btnContinuar");
    inputNombre.focus();

    boton.addEventListener("click", () => {
        const nombre = normalizarNombre(inputNombre.value);

        if (!nombre) {
            inputNombre.classList.add("input-error");
            inputNombre.focus();
            return;
        }

        let nombreChat = "Chat " + codigo;

        if (esNuevo) {
            nombreChat = String(
                document.getElementById("nombreChat").value || ""
            ).trim().slice(0, CONFIG.maxNombreChat) || "Mi chat";
        } else {
            const guardado = obtenerChatsGuardados().find(
                chat => chat.codigo === codigo.toUpperCase()
            );
            if (guardado) nombreChat = guardado.nombre;
        }

        nombreUsuarioActual = nombre;
        codigoChatActual = codigo.toUpperCase();
        chatActual = { codigo: codigoChatActual, nombre: nombreChat };

        guardarChat(codigoChatActual, nombreChat);
        registrarParticipante(nombreUsuarioActual, false);
        mostrarPantallaConectando();
    });

    inputNombre.addEventListener("keydown", event => {
        if (event.key === "Enter") boton.click();
    });

    document.getElementById("btnVolver").addEventListener("click", mostrarInicio);
}

/* =========================================================
   CONECTANDO
========================================================= */

function mostrarPantallaConectando() {
    pantallaChatCreada = false;

    document.body.innerHTML = `
        <main class="app-shell">
            <section class="loading-screen">
                <div class="loading-circle">💬</div>
                <h2>Conectando con ChatPriv</h2>
                <p>Estamos preparando tu conversación...</p>
                <div class="loading-bar"><span></span></div>
                <button id="btnCancelarConexion" class="btn btn-link" type="button">
                    Volver al inicio
                </button>
            </section>
        </main>
    `;

    document.getElementById("btnCancelarConexion")
        .addEventListener("click", salirDelChat);

    conectarSocket();
}

/* =========================================================
   SOCKET.IO
========================================================= */

function conectarSocket() {
    if (typeof window.io !== "function") {
        mostrarErrorConexion(
            "No se encontró Socket.IO. Comprueba index.html y server.js."
        );
        return;
    }

    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
    }

    socket = window.io({
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: CONFIG.reconnectDelay,
        reconnectionDelayMax: 10000,
        timeout: 20000
    });

    socket.on("connect", () => {
        console.log("ChatPriv conectado:", socket.id);

        socket.emit("unirse_chat", {
            codigo: codigoChatActual,
            nombre: nombreUsuarioActual
        });

        registrarParticipante(nombreUsuarioActual, true, socket.id);

        if (!pantallaChatCreada) {
            mostrarChat();
        } else {
            actualizarEstado("Conectado");
            mostrarBannerConexion("");
        }
    });

    socket.on("historial_mensajes", mensajes => {
        const contenedor = document.getElementById("mensajes");
        if (!contenedor || !Array.isArray(mensajes)) return;

        contenedor.replaceChildren();
        idsMensajesMostrados.clear();

        mensajes.forEach(agregarMensaje);
        bajarMensajes();
    });

    socket.on("mensaje", datos => {
        agregarMensaje(datos);
        bajarMensajes();

        if (datos && datos.senderId !== socket.id) {
            void mostrarNotificacion(datos);
        }
    });

    socket.on("participantes_actualizados", combinarParticipantesDelServidor);

    socket.on("usuario_entra", datos => {
        if (!datos) return;

        registrarParticipante(
            datos.nombre,
            true,
            datos.id || datos.socketId || ""
        );

        agregarAviso((datos.nombre || "Un participante") + " se conectó.");
    });

    socket.on("usuario_sale", datos => {
        if (!datos) return;

        registrarParticipante(
            datos.nombre,
            false,
            datos.id || datos.socketId || ""
        );

        agregarAviso((datos.nombre || "Un participante") + " se desconectó.");
    });

    socket.on("usuario_escribiendo", datos => {
        if (datos) mostrarEscribiendo(datos.nombre);
    });

    socket.on("usuario_dejo_de_escribir", ocultarEscribiendo);

    socket.on("disconnect", () => {
        actualizarEstado("Desconectado");
        mostrarBannerConexion(
            "Conexión interrumpida. Intentando reconectar..."
        );

        registrarParticipante(nombreUsuarioActual, false);
        ocultarEscribiendo();
    });

    socket.on("reconnect_attempt", () => {
        actualizarEstado("Reconectando...");
        mostrarBannerConexion("Reconectando con ChatPriv...");
    });

    socket.on("connect_error", error => {
        console.error("Error Socket.IO:", error);
        actualizarEstado("Desconectado");
        mostrarBannerConexion(
            "No hay conexión con el servidor. Reintentando..."
        );
    });
}

/* =========================================================
   PANTALLA DEL CHAT
========================================================= */

function mostrarChat() {
    pantallaChatCreada = true;

    document.body.innerHTML = `
        <main class="chat-app">
            <header class="chat-header">
                <div class="header-left">
                    <div class="chat-logo">💬</div>
                    <div>
                        <h1>${escaparHTML(chatActual?.nombre || "ChatPriv")}</h1>
                        <div id="estadoConexion" class="connection-status">
                            <span>●</span> Conectado
                        </div>
                    </div>
                </div>
                <button id="btnSalir" class="header-button" type="button">Salir</button>
            </header>

            <div id="bannerConexion" class="connection-banner" hidden></div>

            <section class="chat-info">
                <div class="code-box">
                    <span>Código del chat</span>
                    <strong>${escaparHTML(codigoChatActual)}</strong>
                </div>
                <button id="btnCopiar" class="copy-button" type="button">
                    📋 Copiar
                </button>
                <button id="btnNotificaciones" class="copy-button" type="button">
                    🔔 Activar notificaciones
                </button>
            </section>

            <section id="participantes" class="participants"></section>

            <section id="mensajes" class="messages"
                aria-live="polite" aria-label="Mensajes del chat"></section>

            <div id="escribiendo" class="typing"></div>

            <form id="formMensaje" class="message-form">
                <input id="inputMensaje" class="message-input" type="text"
                    maxlength="${CONFIG.maxMensaje}" autocomplete="off"
                    placeholder="Escribe un mensaje..." aria-label="Escribe un mensaje">
                <button type="submit" class="send-button" aria-label="Enviar mensaje">
                    ➤
                </button>
            </form>
        </main>
    `;

    idsMensajesMostrados.clear();
    configurarChat();
    mostrarParticipantes();
}

function mostrarBannerConexion(texto) {
    const banner = document.getElementById("bannerConexion");
    if (!banner) return;

    banner.textContent = texto;
    banner.hidden = !texto;
}

/* =========================================================
   CONTROLES
========================================================= */

function configurarChat() {
    const formulario = document.getElementById("formMensaje");
    const input = document.getElementById("inputMensaje");

    formulario.addEventListener("submit", event => {
        event.preventDefault();
        enviarMensaje();
    });

    input.addEventListener("input", () => {
        if (!socket || !socket.connected) return;

        const hayTexto = Boolean(input.value.trim());

        if (hayTexto && !usuarioEstaEscribiendo) {
            usuarioEstaEscribiendo = true;
            socket.emit("escribiendo");
        }

        clearTimeout(escribiendoTimeout);

        if (!hayTexto) {
            if (usuarioEstaEscribiendo) {
                usuarioEstaEscribiendo = false;
                socket.emit("dejo_de_escribir");
            }
            return;
        }

        escribiendoTimeout = setTimeout(() => {
            usuarioEstaEscribiendo = false;

            if (socket && socket.connected) {
                socket.emit("dejo_de_escribir");
            }
        }, 1000);
    });

    document.getElementById("btnCopiar").addEventListener("click", copiarCodigo);
    document.getElementById("btnSalir").addEventListener("click", salirDelChat);
    document.getElementById("btnNotificaciones")
        .addEventListener("click", activarNotificaciones);

    input.focus();
}

/* =========================================================
   MENSAJES
========================================================= */

function enviarMensaje() {
    const input = document.getElementById("inputMensaje");
    if (!input) return;

    if (!socket || !socket.connected) {
        actualizarEstado("Desconectado");
        mostrarBannerConexion(
            "No se pudo enviar. Espera a que vuelva la conexión."
        );
        return;
    }

    const texto = input.value.trim().slice(0, CONFIG.maxMensaje);
    if (!texto) return;

    socket.emit("mensaje", { texto });
    input.value = "";
    usuarioEstaEscribiendo = false;

    clearTimeout(escribiendoTimeout);
    socket.emit("dejo_de_escribir");
    input.focus();
}

function agregarMensaje(datos) {
    const contenedor = document.getElementById("mensajes");
    if (!contenedor || !datos) return;

    const id = datos.id ? String(datos.id) : "";

    // Evita duplicar mensajes que ya llegaron por el historial.
    if (id && idsMensajesMostrados.has(id)) return;
    if (id) idsMensajesMostrados.add(id);

    const fila = document.createElement("div");
    const mio = Boolean(socket && datos.senderId === socket.id);
    fila.className = mio ? "message-row mine" : "message-row";

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = obtenerInicial(datos.nombre);

    const contenido = document.createElement("div");
    contenido.className = "message-content";

    const nombre = document.createElement("div");
    nombre.className = "message-name";
    nombre.textContent = mio ? "Tú" : String(datos.nombre || "Usuario");

    const burbuja = document.createElement("div");
    burbuja.className = "message-bubble";
    burbuja.textContent = String(datos.texto || "");

    const hora = document.createElement("div");
    hora.className = "message-time";
    hora.textContent = String(datos.hora || "");

    contenido.append(nombre, burbuja, hora);
    fila.append(avatar, contenido);
    contenedor.appendChild(fila);
}

function agregarAviso(texto) {
    const contenedor = document.getElementById("mensajes");
    if (!contenedor) return;

    const aviso = document.createElement("div");
    aviso.className = "system-message";
    aviso.textContent = String(texto || "");

    contenedor.appendChild(aviso);
    bajarMensajes();
}

function bajarMensajes() {
    const contenedor = document.getElementById("mensajes");
    if (!contenedor) return;

    requestAnimationFrame(() => {
        contenedor.scrollTop = contenedor.scrollHeight;
    });
}

/* =========================================================
   PARTICIPANTES
========================================================= */

function mostrarParticipantes() {
    const contenedor = document.getElementById("participantes");
    if (!contenedor) return;

    const participantes = obtenerParticipantesGuardados();

    const titulo = document.createElement("div");
    titulo.className = "participants-title";

    const etiqueta = document.createElement("span");
    etiqueta.textContent = "👥 Participantes";

    const contador = document.createElement("b");
    const conectados = participantes.filter(p => p.conectado).length;
    contador.textContent =
        `${conectados} conectado${conectados === 1 ? "" : "s"}`;

    titulo.append(etiqueta, contador);

    const lista = document.createElement("div");
    lista.className = "participants-list";

    participantes.forEach(persona => {
        const fila = document.createElement("div");
        fila.className = "participant" +
            (persona.conectado ? "" : " is-offline");

        const avatar = document.createElement("div");
        avatar.className = "participant-avatar";
        avatar.textContent = obtenerInicial(persona.nombre);

        const info = document.createElement("div");
        info.className = "participant-info";

        const nombre = document.createElement("strong");
        nombre.textContent = persona.nombre || "Usuario";

        const estado = document.createElement("span");
        const punto = document.createElement("i");

        estado.append(
            punto,
            document.createTextNode(
                persona.conectado ? " Conectado" : " Desconectado"
            )
        );

        info.append(nombre, estado);
        fila.append(avatar, info);
        lista.appendChild(fila);
    });

    if (!participantes.length) {
        const vacio = document.createElement("span");
        vacio.textContent = "Todavía no hay participantes registrados.";
        vacio.style.color = "var(--muted)";
        vacio.style.fontSize = "12px";
        lista.appendChild(vacio);
    }

    contenedor.replaceChildren(titulo, lista);
}

/* =========================================================
   INDICADOR DE ESCRITURA
========================================================= */

function mostrarEscribiendo(nombre) {
    const elemento = document.getElementById("escribiendo");
    if (elemento) {
        elemento.textContent = `${nombre || "Alguien"} está escribiendo...`;
    }
}

function ocultarEscribiendo() {
    const elemento = document.getElementById("escribiendo");
    if (elemento) elemento.textContent = "";
}

/* =========================================================
   ESTADO DE CONEXIÓN
========================================================= */

function actualizarEstado(estado) {
    const elemento = document.getElementById("estadoConexion");
    if (!elemento) return;

    elemento.replaceChildren();

    const punto = document.createElement("span");
    punto.textContent = "●";

    elemento.append(punto, document.createTextNode(" " + estado));
    elemento.classList.toggle("offline", estado !== "Conectado");
}

/* =========================================================
   COPIAR CÓDIGO
========================================================= */

async function copiarCodigo() {
    const boton = document.getElementById("btnCopiar");

    try {
        await navigator.clipboard.writeText(codigoChatActual);

        if (!boton) return;

        const textoAnterior = boton.textContent;
        boton.textContent = "✓ Copiado";

        setTimeout(() => {
            if (boton.isConnected) boton.textContent = textoAnterior;
        }, 1600);
    } catch {
        alert("Código del chat: " + codigoChatActual);
    }
}

/* =========================================================
   SALIR DEL CHAT
========================================================= */

function salirDelChat() {
    clearTimeout(escribiendoTimeout);

    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
    }

    socket = null;
    usuarioEstaEscribiendo = false;
    pantallaChatCreada = false;

    if (codigoChatActual && nombreUsuarioActual) {
        registrarParticipante(nombreUsuarioActual, false);
    }

    codigoChatActual = "";
    nombreUsuarioActual = "";
    chatActual = null;
    idsMensajesMostrados.clear();

    mostrarInicio();
}

/* =========================================================
   ERRORES
========================================================= */

function mostrarErrorConexion(texto) {
    document.body.innerHTML = `
        <main class="app-shell">
            <section class="loading-screen">
                <div class="loading-circle">⚠️</div>
                <h2>No se pudo conectar</h2>
                <p id="detalleError"></p>
                <button id="btnVolverError" class="btn btn-primary" type="button">
                    Volver al inicio
                </button>
            </section>
        </main>
    `;

    document.getElementById("detalleError").textContent = texto;
    document.getElementById("btnVolverError")
        .addEventListener("click", mostrarInicio);
}

/* =========================================================
   INICIAR
========================================================= */

instalarEstilos();
void registrarServiceWorker();
mostrarInicio();