"use strict";

/* =========================================================
   CHATPRIV
   Aplicación de chat en tiempo real
   + Notificaciones
   + Service Worker
========================================================= */

const CODIGO_PRUEBA = "23Y29";

let socket = null;

let codigoChatActual = "";

let nombreUsuarioActual = "";

let chatActual = null;

let escribiendoTimeout = null;

let usuarioEstaEscribiendo = false;

let registroServiceWorker = null;


/* =========================================================
   SERVICE WORKER
========================================================= */

async function registrarServiceWorker() {

    if (!("serviceWorker" in navigator)) {

        console.log(
            "Service Worker no disponible."
        );

        return null;
    }

    try {

        registroServiceWorker =
            await navigator.serviceWorker.register(
                "/sw.js"
            );

        console.log(
            "Service Worker registrado correctamente."
        );

        return registroServiceWorker;

    } catch (error) {

        console.error(
            "Error registrando Service Worker:",
            error
        );

        return null;
    }
}


/* =========================================================
   UTILIDADES
========================================================= */

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto;

    return div.innerHTML;
}


function obtenerInicial(nombre) {

    if (!nombre) {
        return "?";
    }

    return nombre
        .trim()
        .charAt(0)
        .toUpperCase();
}


function obtenerHora() {

    return new Date().toLocaleTimeString(
        "es-DO",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function generarCodigo() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo = "";

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        codigo += caracteres.charAt(
            Math.floor(
                Math.random() *
                caracteres.length
            )
        );
    }

    return codigo;
}


/* =========================================================
   NOTIFICACIONES
========================================================= */

async function solicitarPermisoNotificaciones() {

    if (
        !("Notification" in window)
    ) {

        console.log(
            "Este navegador no admite notificaciones."
        );

        return false;
    }


    if (
        Notification.permission ===
        "granted"
    ) {

        console.log(
            "Notificaciones ya autorizadas."
        );

        return true;
    }


    if (
        Notification.permission ===
        "denied"
    ) {

        console.log(
            "Las notificaciones están bloqueadas."
        );

        return false;
    }


    try {

        const permiso =
            await Notification.requestPermission();

        console.log(
            "Permiso de notificaciones:",
            permiso
        );

        return permiso ===
            "granted";

    } catch (error) {

        console.error(
            "Error solicitando permiso de notificaciones:",
            error
        );

        return false;
    }
}


function mostrarNotificacion(datos) {

    if (
        !("Notification" in window)
    ) {
        return;
    }


    if (
        Notification.permission !==
        "granted"
    ) {
        return;
    }


    if (!document.hidden) {
        return;
    }


    if (!datos) {
        return;
    }


    if (
        socket &&
        datos.senderId === socket.id
    ) {

        return;
    }


    const nombre =
        String(
            datos.nombre ||
            "ChatPriv"
        );


    const texto =
        String(
            datos.texto ||
            "Tienes un nuevo mensaje."
        );


    try {

        const notificacion =
            new Notification(
                "💬 " + nombre,
                {
                    body: texto,

                    tag:
                        "chatpriv-" +
                        codigoChatActual,

                    renotify: true
                }
            );


        notificacion.onclick =
            () => {

                try {

                    window.focus();

                } catch (error) {}

                notificacion.close();
            };

    } catch (error) {

        console.error(
            "No se pudo mostrar la notificación:",
            error
        );
    }
}


/* =========================================================
   CHATS GUARDADOS
========================================================= */

function obtenerChatsGuardados() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "chatpriv_chats"
            )
        ) || [];

    } catch (error) {

        return [];
    }
}


function guardarChats(chats) {

    localStorage.setItem(
        "chatpriv_chats",
        JSON.stringify(chats)
    );
}


function guardarChat(
    codigo,
    nombre
) {

    const chats =
        obtenerChatsGuardados();

    const existente =
        chats.find(
            chat =>
                chat.codigo === codigo
        );


    if (existente) {

        existente.nombre =
            nombre;

    } else {

        chats.unshift({
            codigo,
            nombre,
            fecha: Date.now()
        });
    }


    guardarChats(chats);
}


function eliminarChat(codigo) {

    const chats =
        obtenerChatsGuardados()
            .filter(
                chat =>
                    chat.codigo !== codigo
            );

    guardarChats(chats);

    mostrarInicio();
}


/* =========================================================
   PANTALLA PRINCIPAL
========================================================= */

function mostrarInicio() {

    document.body.innerHTML = `

        <main class="app-shell">

            <section class="inicio">

                <div class="hero">

                    <div class="logo-grande">
                        💬
                    </div>

                    <div>

                        <h1>
                            ChatPriv
                        </h1>

                        <p>
                            Conversaciones privadas,
                            simples y en tiempo real.
                        </p>

                    </div>

                </div>


                <div class="card principal-card">

                    <div class="card-header">

                        <span class="icono-card">
                            🔐
                        </span>

                        <div>

                            <h2>
                                Entrar a un chat
                            </h2>

                            <p>
                                Usa el código que
                                te compartieron.
                            </p>

                        </div>

                    </div>


                    <input
                        id="codigoChat"
                        class="input"
                        type="text"
                        maxlength="20"
                        placeholder="Ejemplo: 23Y29"
                        autocomplete="off"
                    >


                    <button
                        id="btnEntrar"
                        class="btn btn-primary"
                    >
                        Entrar al chat
                    </button>


                    <div class="separator">

                        <span>
                            o
                        </span>

                    </div>


                    <button
                        id="btnCrear"
                        class="btn btn-secondary"
                    >
                        ✨ Crear nuevo chat
                    </button>


                    <p
                        id="mensaje"
                        class="mensaje"
                    ></p>

                </div>


                <section
                    id="misChats"
                    class="mis-chats"
                ></section>


                <div class="privacidad">

                    🔒
                    Tus chats guardados se almacenan
                    en este dispositivo.

                </div>

            </section>

        </main>
    `;


    configurarInicio();

    mostrarChatsGuardados();
}


/* =========================================================
   CONFIGURAR INICIO
========================================================= */

function configurarInicio() {

    const input =
        document.getElementById(
            "codigoChat"
        );

    const btnEntrar =
        document.getElementById(
            "btnEntrar"
        );

    const btnCrear =
        document.getElementById(
            "btnCrear"
        );


    btnEntrar.addEventListener(
        "click",
        () => {

            const codigo =
                input.value
                    .trim()
                    .toUpperCase();


            if (!codigo) {

                mostrarMensajeInicio(
                    "Escribe el código del chat."
                );

                return;
            }


            mostrarPantallaNombre(
                codigo,
                false
            );
        }
    );


    btnCrear.addEventListener(
        "click",
        () => {

            const codigo =
                generarCodigo();

            mostrarPantallaNombre(
                codigo,
                true
            );
        }
    );


    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                btnEntrar.click();
            }
        }
    );
}


/* =========================================================
   MENSAJE DE INICIO
========================================================= */

function mostrarMensajeInicio(texto) {

    const mensaje =
        document.getElementById(
            "mensaje"
        );

    if (!mensaje) {
        return;
    }


    mensaje.textContent =
        texto;


    mensaje.className =
        "mensaje error";


    setTimeout(
        () => {

            if (mensaje) {

                mensaje.textContent =
                    "";
            }

        },
        3000
    );
}


/* =========================================================
   CHATS GUARDADOS
========================================================= */

function mostrarChatsGuardados() {

    const contenedor =
        document.getElementById(
            "misChats"
        );

    if (!contenedor) {
        return;
    }


    const chats =
        obtenerChatsGuardados();


    if (
        chats.length === 0
    ) {

        contenedor.innerHTML =
            "";

        return;
    }


    let html = `

        <div class="section-title">

            <div>

                <h2>
                    Mis chats
                </h2>

                <p>
                    Tus conversaciones guardadas
                </p>

            </div>

            <span class="badge-count">
                ${chats.length}
            </span>

        </div>

        <div class="chat-list">
    `;


    chats.forEach(
        chat => {

            html += `

                <article
                    class="saved-chat"
                >

                    <div class="saved-avatar">
                        💬
                    </div>

                    <div class="saved-info">

                        <strong>
                            ${escaparHTML(
                                chat.nombre
                            )}
                        </strong>

                        <span>
                            Código:
                            <b>
                                ${escaparHTML(
                                    chat.codigo
                                )}
                            </b>
                        </span>

                    </div>

                    <button
                        class="saved-enter"
                        data-codigo="${escaparHTML(
                            chat.codigo
                        )}"
                    >
                        Entrar
                    </button>

                    <button
                        class="saved-delete"
                        data-codigo="${escaparHTML(
                            chat.codigo
                        )}"
                        title="Eliminar chat"
                    >
                        🗑️
                    </button>

                </article>
            `;
        }
    );


    html += `
        </div>
    `;


    contenedor.innerHTML =
        html;


    contenedor
        .querySelectorAll(
            ".saved-enter"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        mostrarPantallaNombre(
                            button.dataset.codigo,
                            false
                        );
                    }
                );
            }
        );


    contenedor
        .querySelectorAll(
            ".saved-delete"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        eliminarChat(
                            button.dataset.codigo
                        );
                    }
                );
            }
        );
}


/* =========================================================
   PANTALLA DE NOMBRE
========================================================= */

function mostrarPantallaNombre(
    codigo,
    esNuevo
) {

    document.body.innerHTML = `

        <main class="app-shell">

            <section class="nombre-screen">

                <div class="logo-grande">
                    👤
                </div>

                <h1>
                    ${
                        esNuevo
                        ? "Crear chat"
                        : "Entrar al chat"
                    }
                </h1>

                <p class="subtitle">
                    Elige el nombre que verán
                    las demás personas.
                </p>


                <div class="card">

                    <label>
                        Tu nombre
                    </label>

                    <input
                        id="nombreUsuario"
                        class="input"
                        type="text"
                        maxlength="30"
                        placeholder="Ejemplo: Alex"
                        autocomplete="off"
                    >


                    ${
                        esNuevo
                        ?
                        `
                            <label>
                                Nombre del chat
                            </label>

                            <input
                                id="nombreChat"
                                class="input"
                                type="text"
                                maxlength="40"
                                placeholder="Ejemplo: Amigos"
                                autocomplete="off"
                            >
                        `
                        :
                        `
                            <div class="codigo-preview">

                                <span>
                                    Código
                                </span>

                                <strong>
                                    ${escaparHTML(
                                        codigo
                                    )}
                                </strong>

                            </div>
                        `
                    }


                    <button
                        id="btnContinuar"
                        class="btn btn-primary"
                    >
                        Continuar
                    </button>


                    <button
                        id="btnVolver"
                        class="btn btn-link"
                    >
                        ← Volver
                    </button>

                </div>

            </section>

        </main>
    `;


    const nombreInput =
        document.getElementById(
            "nombreUsuario"
        );

    const btnContinuar =
        document.getElementById(
            "btnContinuar"
        );

    const btnVolver =
        document.getElementById(
            "btnVolver"
        );


    nombreInput.focus();


    btnContinuar.addEventListener(
        "click",
        () => {

            const nombre =
                nombreInput.value
                    .trim();


            if (!nombre) {

                nombreInput.classList.add(
                    "input-error"
                );

                nombreInput.focus();

                return;
            }


            let nombreChat = "";


            if (esNuevo) {

                const inputChat =
                    document.getElementById(
                        "nombreChat"
                    );

                nombreChat =
                    inputChat.value.trim();


                if (!nombreChat) {

                    inputChat.value =
                        "Mi chat";

                    nombreChat =
                        "Mi chat";
                }

            } else {

                const chats =
                    obtenerChatsGuardados();

                const encontrado =
                    chats.find(
                        chat =>
                            chat.codigo ===
                            codigo
                    );

                nombreChat =
                    encontrado
                    ? encontrado.nombre
                    : "Chat " + codigo;
            }


            guardarChat(
                codigo,
                nombreChat
            );


            nombreUsuarioActual =
                nombre;

            codigoChatActual =
                codigo;


            chatActual = {

                codigo,
                nombre:
                    nombreChat
            };


            mostrarPantallaConectando();
        }
    );


    nombreInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                btnContinuar.click();
            }
        }
    );


    btnVolver.addEventListener(
        "click",
        () => {

            mostrarInicio();
        }
    );
}


/* =========================================================
   CONECTANDO
========================================================= */

function mostrarPantallaConectando() {

    document.body.innerHTML = `

        <main class="app-shell">

            <section class="loading-screen">

                <div class="loading-circle">
                    💬
                </div>

                <h2>
                    Conectando...
                </h2>

                <p>
                    Preparando tu chat privado
                </p>

                <div class="loading-bar">

                    <span></span>

                </div>

            </section>

        </main>
    `;


    conectarSocket();
}


/* =========================================================
   SOCKET
========================================================= */

function conectarSocket() {

    if (
        typeof io !== "function"
    ) {

        mostrarErrorConexion(
            "No se encontró Socket.IO."
        );

        return;
    }


    if (socket) {

        try {

            socket.disconnect();

        } catch (error) {}
    }


    socket = io();


    socket.on(
        "connect",
        () => {

            console.log(
                "Socket conectado:",
                socket.id
            );


            socket.emit(
                "unirse_chat",
                {
                    codigo:
                        codigoChatActual,

                    nombre:
                        nombreUsuarioActual
                }
            );


            mostrarChat();


            solicitarPermisoNotificaciones();
        }
    );


    socket.on(
        "historial_mensajes",
        mensajes => {

            if (
                !Array.isArray(
                    mensajes
                )
            ) {
                return;
            }


            const contenedor =
                document.getElementById(
                    "mensajes"
                );


            if (!contenedor) {
                return;
            }


            contenedor.innerHTML =
                "";


            mensajes.forEach(
                mensaje => {

                    agregarMensaje(
                        mensaje
                    );
                }
            );


            bajarMensajes();
        }
    );


    /* =====================================================
       MENSAJES
    ===================================================== */

    socket.on(
        "mensaje",
        datos => {

            agregarMensaje(
                datos
            );


            bajarMensajes();


            if (
                socket &&
                datos &&
                datos.senderId !==
                    socket.id
            ) {

                mostrarNotificacion(
                    datos
                );
            }
        }
    );


    /* =====================================================
       PARTICIPANTES
    ===================================================== */

    socket.on(
        "participantes_actualizados",
        participantes => {

            mostrarParticipantes(
                participantes
            );
        }
    );


    socket.on(
        "usuario_entra",
        datos => {

            if (!datos) {
                return;
            }


            agregarAviso(
                `${datos.nombre} se conectó al chat`
            );
        }
    );


    socket.on(
        "usuario_sale",
        datos => {

            if (!datos) {
                return;
            }


            agregarAviso(
                `${datos.nombre} salió del chat`
            );
        }
    );


    /* =====================================================
       ESCRIBIENDO
    ===================================================== */

    socket.on(
        "usuario_escribiendo",
        datos => {

            if (!datos) {
                return;
            }


            mostrarEscribiendo(
                datos.nombre
            );
        }
    );


    socket.on(
        "usuario_dejo_de_escribir",
        () => {

            ocultarEscribiendo();
        }
    );


    /* =====================================================
       DESCONEXIÓN
    ===================================================== */

    socket.on(
        "disconnect",
        () => {

            actualizarEstado(
                "Desconectado"
            );
        }
    );


    /* =====================================================
       ERROR
    ===================================================== */

    socket.on(
        "connect_error",
        error => {

            console.error(
                "Error Socket.IO:",
                error
            );


            mostrarErrorConexion(
                "No se pudo conectar con el servidor."
            );
        }
    );
}


/* =========================================================
   INTERFAZ DEL CHAT
========================================================= */

function mostrarChat() {

    document.body.innerHTML = `

        <main class="chat-app">

            <header class="chat-header">

                <div class="header-left">

                    <div class="chat-logo">
                        💬
                    </div>

                    <div>

                        <h1>
                            ${
                                escaparHTML(
                                    chatActual
                                    ? chatActual.nombre
                                    : "ChatPriv"
                                )
                            }
                        </h1>

                        <div
                            id="estadoConexion"
                            class="connection-status"
                        >

                            <span>
                                ●
                            </span>

                            Conectado

                        </div>

                    </div>

                </div>


                <button
                    id="btnSalir"
                    class="header-button"
                >
                    Salir
                </button>

            </header>


            <section class="chat-info">

                <div class="code-box">

                    <span>
                        Código del chat
                    </span>

                    <strong>
                        ${escaparHTML(
                            codigoChatActual
                        )}
                    </strong>

                </div>


                <button
                    id="btnCopiar"
                    class="copy-button"
                >
                    📋 Copiar
                </button>

            </section>


            <section
                id="participantes"
                class="participants"
            >
            </section>


            <section
                id="mensajes"
                class="messages"
            >
            </section>


            <div
                id="escribiendo"
                class="typing"
            >
            </div>


            <form
                id="formMensaje"
                class="message-form"
            >

                <input
                    id="inputMensaje"
                    class="message-input"
                    type="text"
                    maxlength="500"
                    autocomplete="off"
                    placeholder="Escribe un mensaje..."
                >


                <button
                    type="submit"
                    class="send-button"
                >
                    ➤
                </button>

            </form>

        </main>
    `;


    configurarChat();
}


/* =========================================================
   CONFIGURAR CHAT
========================================================= */

function configurarChat() {

    const form =
        document.getElementById(
            "formMensaje"
        );

    const input =
        document.getElementById(
            "inputMensaje"
        );

    const btnCopiar =
        document.getElementById(
            "btnCopiar"
        );

    const btnSalir =
        document.getElementById(
            "btnSalir"
        );


    if (
        !form ||
        !input ||
        !btnCopiar ||
        !btnSalir
    ) {

        console.error(
            "ChatPriv: elementos del chat no encontrados."
        );

        return;
    }


    input.focus();


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            enviarMensaje();
        }
    );


    input.addEventListener(
        "input",
        () => {

            if (!socket) {
                return;
            }


            const texto =
                input.value.trim();


            if (
                texto.length > 0 &&
                !usuarioEstaEscribiendo
            ) {

                usuarioEstaEscribiendo =
                    true;


                socket.emit(
                    "escribiendo"
                );
            }


            clearTimeout(
                escribiendoTimeout
            );


            if (!texto) {

                if (
                    usuarioEstaEscribiendo
                ) {

                    usuarioEstaEscribiendo =
                        false;


                    socket.emit(
                        "dejo_de_escribir"
                    );
                }

                return;
            }


            escribiendoTimeout =
                setTimeout(
                    () => {

                        usuarioEstaEscribiendo =
                            false;


                        if (socket) {

                            socket.emit(
                                "dejo_de_escribir"
                            );
                        }

                    },
                    1000
                );
        }
    );


    btnCopiar.addEventListener(
        "click",
        copiarCodigo
    );


    btnSalir.addEventListener(
        "click",
        salirDelChat
    );
}


/* =========================================================
   ENVIAR MENSAJE
========================================================= */

function enviarMensaje() {

    const input =
        document.getElementById(
            "inputMensaje"
        );


    if (
        !input ||
        !socket
    ) {
        return;
    }


    const texto =
        input.value.trim();


    if (!texto) {
        return;
    }


    socket.emit(
        "mensaje",
        {
            texto
        }
    );


    input.value =
        "";


    usuarioEstaEscribiendo =
        false;


    clearTimeout(
        escribiendoTimeout
    );


    socket.emit(
        "dejo_de_escribir"
    );


    input.focus();
}


/* =========================================================
   AGREGAR MENSAJE
========================================================= */

function agregarMensaje(datos) {

    const contenedor =
        document.getElementById(
            "mensajes"
        );


    if (
        !contenedor ||
        !datos
    ) {
        return;
    }


    const mio =
        socket &&
        datos.senderId ===
            socket.id;


    const mensaje =
        document.createElement(
            "div"
        );


    mensaje.className =
        mio
        ? "message-row mine"
        : "message-row";


    mensaje.innerHTML = `

        <div class="message-avatar">

            ${obtenerInicial(
                datos.nombre
            )}

        </div>


        <div class="message-content">

            <div class="message-name">

                ${escaparHTML(
                    mio
                    ? "Tú"
                    : datos.nombre
                )}

            </div>


            <div class="message-bubble">

                ${escaparHTML(
                    datos.texto
                )}

            </div>


            <div class="message-time">

                ${escaparHTML(
                    datos.hora ||
                    obtenerHora()
                )}

            </div>

        </div>
    `;


    contenedor.appendChild(
        mensaje
    );
}


/* =========================================================
   AVISOS
========================================================= */

function agregarAviso(texto) {

    const contenedor =
        document.getElementById(
            "mensajes"
        );


    if (!contenedor) {
        return;
    }


    const aviso =
        document.createElement(
            "div"
        );


    aviso.className =
        "system-message";


    aviso.innerHTML = `

        <span>
            ${escaparHTML(
                texto
            )}
        </span>

    `;


    contenedor.appendChild(
        aviso
    );


    bajarMensajes();
}


/* =========================================================
   PARTICIPANTES
========================================================= */

function mostrarParticipantes(
    participantes
) {

    const contenedor =
        document.getElementById(
            "participantes"
        );


    if (!contenedor) {
        return;
    }


    if (
        !Array.isArray(
            participantes
        )
    ) {

        participantes = [];
    }


    const cantidad =
        participantes.length;


    let html = `

        <div class="participants-title">

            <span>
                👥 Participantes
            </span>

            <b>
                ${cantidad}
            </b>

        </div>

        <div class="participants-list">
    `;


    participantes.forEach(
        participante => {

            html += `

                <div
                    class="participant"
                >

                    <div
                        class="participant-avatar"
                    >

                        ${obtenerInicial(
                            participante.nombre
                        )}

                    </div>


                    <div
                        class="participant-info"
                    >

                        <strong>

                            ${escaparHTML(
                                participante.nombre
                            )}

                        </strong>


                        <span>

                            <i></i>

                            Conectado

                        </span>

                    </div>

                </div>
            `;
        }
    );


    html += `
        </div>
    `;


    contenedor.innerHTML =
        html;
}


/* =========================================================
   ESCRIBIENDO
========================================================= */

function mostrarEscribiendo(
    nombre
) {

    const elemento =
        document.getElementById(
            "escribiendo"
        );


    if (!elemento) {
        return;
    }


    elemento.innerHTML = `

        <span>
            ${escaparHTML(
                nombre
            )}
        </span>

        está escribiendo

        <b class="typing-dots">

            <i>.</i>
            <i>.</i>
            <i>.</i>

        </b>
    `;
}


function ocultarEscribiendo() {

    const elemento =
        document.getElementById(
            "escribiendo"
        );


    if (!elemento) {
        return;
    }


    elemento.innerHTML =
        "";
}


/* =========================================================
   BAJAR MENSAJES
========================================================= */

function bajarMensajes() {

    const contenedor =
        document.getElementById(
            "mensajes"
        );


    if (!contenedor) {
        return;
    }


    setTimeout(
        () => {

            contenedor.scrollTop =
                contenedor.scrollHeight;

        },
        20
    );
}


/* =========================================================
   ESTADO
========================================================= */

function actualizarEstado(
    estado
) {

    const elemento =
        document.getElementById(
            "estadoConexion"
        );


    if (!elemento) {
        return;
    }


    elemento.innerHTML = `

        <span>
            ●
        </span>

        ${escaparHTML(
            estado
        )}

    `;


    if (
        estado !== "Conectado"
    ) {

        elemento.classList.add(
            "offline"
        );

    } else {

        elemento.classList.remove(
            "offline"
        );
    }
}


/* =========================================================
   COPIAR CÓDIGO
========================================================= */

async function copiarCodigo() {

    try {

        await navigator.clipboard.writeText(
            codigoChatActual
        );


        const boton =
            document.getElementById(
                "btnCopiar"
            );


        if (!boton) {
            return;
        }


        const textoOriginal =
            boton.textContent;


        boton.textContent =
            "✓ Copiado";


        setTimeout(
            () => {

                boton.textContent =
                    textoOriginal;

            },
            1500
        );

    } catch (error) {

        alert(
            "Código del chat: " +
            codigoChatActual
        );
    }
}


/* =========================================================
   ERROR
========================================================= */

function mostrarErrorConexion(
    texto
) {

    document.body.innerHTML = `

        <main class="app-shell">

            <section class="loading-screen">

                <div class="error-icon">
                    ⚠️
                </div>

                <h2>
                    No se pudo conectar
                </h2>

                <p>
                    ${escaparHTML(
                        texto
                    )}
                </p>

                <button
                    class="btn btn-primary"
                    onclick="mostrarInicio()"
                >
                    Volver al inicio
                </button>

            </section>

        </main>
    `;
}


/* =========================================================
   SALIR
========================================================= */

function salirDelChat() {

    if (socket) {

        try {

            socket.disconnect();

        } catch (error) {}
    }


    socket = null;

    codigoChatActual =
        "";

    nombreUsuarioActual =
        "";

    chatActual =
        null;


    mostrarInicio();
}


/* =========================================================
   INICIAR
========================================================= */

registrarServiceWorker();

mostrarInicio();