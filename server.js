"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const webpush = require("web-push");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3000;


/* =========================================================
   WEB PUSH
========================================================= */

const VAPID_PUBLIC_KEY =
    process.env.VAPID_PUBLIC_KEY;

const VAPID_PRIVATE_KEY =
    process.env.VAPID_PRIVATE_KEY;

const VAPID_SUBJECT =
    process.env.VAPID_SUBJECT;


/*
   Comprobamos que las claves existan.
*/

if (
    !VAPID_PUBLIC_KEY ||
    !VAPID_PRIVATE_KEY ||
    !VAPID_SUBJECT
) {

    console.error(
        "ERROR: Faltan las variables VAPID en .env"
    );

} else {

    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );

    console.log(
        "Web Push: CONFIGURADO"
    );
}


/*
   Las suscripciones se mantienen
   en memoria mientras el servidor
   está encendido.
*/

const suscripcionesPush = new Map();


/* =========================================================
   SERVIDOR WEB
========================================================= */

app.use(express.json());

app.use(
    express.static(__dirname)
);


app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );
    }
);


/* =========================================================
   CLAVE PÚBLICA VAPID
========================================================= */

app.get(
    "/api/push-public-key",
    (req, res) => {

        if (!VAPID_PUBLIC_KEY) {

            return res.status(500).json({
                ok: false,
                error:
                    "VAPID_PUBLIC_KEY no configurada."
            });
        }


        res.json({
            ok: true,
            publicKey:
                VAPID_PUBLIC_KEY
        });
    }
);


/* =========================================================
   SUSCRIPCIÓN PUSH
========================================================= */

app.post(
    "/api/push/subscribe",
    (req, res) => {

        try {

            const body =
                req.body;


            if (
                !body ||
                typeof body !== "object"
            ) {

                return res.status(400).json({
                    ok: false,
                    error:
                        "Datos inválidos."
                });
            }


            const subscription =
                body.subscription;


            const codigo =
                limpiarTexto(
                    body.codigo,
                    20
                ).toUpperCase();


            const nombre =
                limpiarTexto(
                    body.nombre,
                    30
                );


            if (
                !subscription ||
                !subscription.endpoint
            ) {

                return res.status(400).json({
                    ok: false,
                    error:
                        "Suscripción Push inválida."
                });
            }


            if (!codigo) {

                return res.status(400).json({
                    ok: false,
                    error:
                        "Código de chat requerido."
                });
            }


            suscripcionesPush.set(
                subscription.endpoint,
                {
                    subscription,
                    codigo,
                    nombre
                }
            );


            console.log(
                `Push registrado: ${nombre || "Usuario"} → ${codigo}`
            );


            res.json({
                ok: true
            });

        } catch (error) {

            console.error(
                "Error registrando Push:",
                error
            );


            res.status(500).json({
                ok: false,
                error:
                    "No se pudo registrar la suscripción."
            });
        }
    }
);


/* =========================================================
   CANCELAR SUSCRIPCIÓN PUSH
========================================================= */

app.post(
    "/api/push/unsubscribe",
    (req, res) => {

        try {

            const body =
                req.body;


            const subscription =
                body &&
                body.subscription;


            if (
                !subscription ||
                !subscription.endpoint
            ) {

                return res.status(400).json({
                    ok: false,
                    error:
                        "Suscripción inválida."
                });
            }


            suscripcionesPush.delete(
                subscription.endpoint
            );


            console.log(
                "Suscripción Push eliminada."
            );


            res.json({
                ok: true
            });

        } catch (error) {

            console.error(
                "Error eliminando Push:",
                error
            );


            res.status(500).json({
                ok: false
            });
        }
    }
);


/* =========================================================
   DATOS
========================================================= */

const usuarios =
    new Map();


const mensajesPorChat =
    new Map();


/* =========================================================
   UTILIDADES
========================================================= */

function limpiarTexto(
    valor,
    limite = 500
) {

    return String(
        valor || ""
    )
        .trim()
        .slice(
            0,
            limite
        );
}


/* =========================================================
   PARTICIPANTES
========================================================= */

function obtenerParticipantes(
    codigo
) {

    const participantes = [];


    for (
        const [
            socketId,
            usuario
        ]
        of usuarios
    ) {

        if (
            usuario.codigo ===
            codigo
        ) {

            participantes.push({

                id:
                    socketId,

                nombre:
                    usuario.nombre,

                conectado:
                    true

            });
        }
    }


    return participantes;
}


function actualizarParticipantes(
    codigo
) {

    if (!codigo) {
        return;
    }


    io.to(
        codigo
    ).emit(
        "participantes_actualizados",
        obtenerParticipantes(
            codigo
        )
    );
}


/* =========================================================
   HISTORIAL
========================================================= */

function obtenerMensajes(
    codigo
) {

    return (
        mensajesPorChat.get(
            codigo
        ) ||
        []
    );
}


function guardarMensaje(
    codigo,
    mensaje
) {

    if (
        !mensajesPorChat.has(
            codigo
        )
    ) {

        mensajesPorChat.set(
            codigo,
            []
        );
    }


    const mensajes =
        mensajesPorChat.get(
            codigo
        );


    mensajes.push(
        mensaje
    );


    /*
       Conservamos como máximo
       200 mensajes por chat.
    */

    if (
        mensajes.length >
        200
    ) {

        mensajes.shift();
    }
}


/* =========================================================
   ENVIAR PUSH
========================================================= */

async function enviarPushAlChat(
    codigo,
    mensaje,
    socketIdRemitente
) {

    if (
        !VAPID_PUBLIC_KEY ||
        !VAPID_PRIVATE_KEY ||
        !VAPID_SUBJECT
    ) {

        return;
    }


    const tareas = [];


    for (
        const [
            endpoint,
            datos
        ]
        of suscripcionesPush
    ) {

        if (
            !datos ||
            datos.codigo !== codigo
        ) {

            continue;
        }


        /*
           No notificamos al remitente.
        */

        if (
            datos.socketId &&
            datos.socketId ===
                socketIdRemitente
        ) {

            continue;
        }


        const payload =
            JSON.stringify({

                titulo:
                    "💬 " +
                    (
                        mensaje.nombre ||
                        "ChatPriv"
                    ),

                mensaje:
                    mensaje.texto ||
                    "Tienes un nuevo mensaje.",

                tag:
                    "chatpriv-" +
                    codigo
            });


        const tarea =
            webpush.sendNotification(
                datos.subscription,
                payload
            )
            .then(
                () => {

                    console.log(
                        `Push enviado → ${datos.nombre || "Usuario"}`
                    );
                }
            )
            .catch(
                error => {

                    console.error(
                        "Error enviando Push:",
                        error.statusCode ||
                        error.message
                    );


                    /*
                       404 y 410 normalmente
                       significan que la
                       suscripción ya no existe.
                    */

                    if (
                        error.statusCode ===
                            404 ||
                        error.statusCode ===
                            410
                    ) {

                        suscripcionesPush.delete(
                            endpoint
                        );

                        console.log(
                            "Suscripción Push eliminada por estar inválida."
                        );
                    }
                }
            );


        tareas.push(
            tarea
        );
    }


    await Promise.allSettled(
        tareas
    );
}


/* =========================================================
   SOCKET.IO
========================================================= */

io.on(
    "connection",
    socket => {

        console.log(
            "Usuario conectado:",
            socket.id
        );


        /* =================================================
           ENTRAR AL CHAT
        ================================================= */

        socket.on(
            "unirse_chat",
            datos => {

                if (
                    !datos ||
                    typeof datos !==
                        "object"
                ) {

                    return;
                }


                const codigo =
                    limpiarTexto(
                        datos.codigo,
                        20
                    )
                    .toUpperCase();


                const nombre =
                    limpiarTexto(
                        datos.nombre,
                        30
                    );


                if (
                    !codigo ||
                    !nombre
                ) {

                    return;
                }


                /*
                   Si estaba en otro chat,
                   lo sacamos primero.
                */

                const usuarioAnterior =
                    usuarios.get(
                        socket.id
                    );


                if (
                    usuarioAnterior
                ) {

                    socket.leave(
                        usuarioAnterior.codigo
                    );


                    usuarios.delete(
                        socket.id
                    );


                    actualizarParticipantes(
                        usuarioAnterior.codigo
                    );
                }


                /*
                   Entrar al chat.
                */

                socket.join(
                    codigo
                );


                usuarios.set(
                    socket.id,
                    {
                        codigo:
                            codigo,

                        nombre:
                            nombre
                    }
                );


                /*
                   Asociamos cualquier
                   suscripción de este
                   socket con el usuario.
                */

                for (
                    const datosPush
                    of suscripcionesPush.values()
                ) {

                    if (
                        datosPush &&
                        datosPush.codigo ===
                            codigo &&
                        datosPush.nombre ===
                            nombre
                    ) {

                        datosPush.socketId =
                            socket.id;
                    }
                }


                console.log(
                    `${nombre} entró al chat ${codigo}`
                );


                /*
                   Historial.
                */

                socket.emit(
                    "historial_mensajes",
                    obtenerMensajes(
                        codigo
                    )
                );


                /*
                   Avisar a los demás.
                */

                socket.to(
                    codigo
                ).emit(
                    "usuario_entra",
                    {
                        id:
                            socket.id,

                        nombre:
                            nombre
                    }
                );


                /*
                   Actualizar participantes.
                */

                actualizarParticipantes(
                    codigo
                );
            }
        );


        /* =================================================
           REGISTRAR SOCKET EN SUSCRIPCIÓN PUSH
        ================================================= */

        socket.on(
            "registrar_push",
            datos => {

                if (
                    !datos ||
                    typeof datos !==
                        "object"
                ) {

                    return;
                }


                const subscription =
                    datos.subscription;


                const usuario =
                    usuarios.get(
                        socket.id
                    );


                if (
                    !subscription ||
                    !subscription.endpoint ||
                    !usuario
                ) {

                    return;
                }


                suscripcionesPush.set(
                    subscription.endpoint,
                    {
                        subscription,

                        codigo:
                            usuario.codigo,

                        nombre:
                            usuario.nombre,

                        socketId:
                            socket.id
                    }
                );


                console.log(
                    `Push asociado a ${usuario.nombre} → ${usuario.codigo}`
                );
            }
        );


        /* =================================================
           MENSAJES
        ================================================= */

        socket.on(
            "mensaje",
            datos => {

                if (
                    !datos ||
                    typeof datos !==
                        "object"
                ) {

                    return;
                }


                const usuario =
                    usuarios.get(
                        socket.id
                    );


                if (!usuario) {

                    return;
                }


                const texto =
                    limpiarTexto(
                        datos.texto,
                        500
                    );


                if (!texto) {

                    return;
                }


                const ahora =
                    new Date();


                const hora =
                    ahora.toLocaleTimeString(
                        "es-DO",
                        {
                            hour:
                                "2-digit",

                            minute:
                                "2-digit"
                        }
                    );


                const mensaje = {

                    id:
                        Date.now()
                        .toString() +
                        "-" +
                        Math.random()
                            .toString(36)
                            .slice(2, 8),

                    senderId:
                        socket.id,

                    nombre:
                        usuario.nombre,

                    texto:
                        texto,

                    hora:
                        hora
                };


                guardarMensaje(
                    usuario.codigo,
                    mensaje
                );


                /*
                   Enviar el mensaje
                   inmediatamente al chat.
                */

                io.to(
                    usuario.codigo
                ).emit(
                    "mensaje",
                    mensaje
                );


                /*
                   Enviar Push a los
                   usuarios suscritos.
                */

                enviarPushAlChat(
                    usuario.codigo,
                    mensaje,
                    socket.id
                );


                console.log(
                    `[${usuario.codigo}] ${usuario.nombre}: ${texto}`
                );
            }
        );


        /* =================================================
           USUARIO ESCRIBIENDO
        ================================================= */

        socket.on(
            "escribiendo",
            () => {

                const usuario =
                    usuarios.get(
                        socket.id
                    );


                if (!usuario) {

                    return;
                }


                socket
                    .to(
                        usuario.codigo
                    )
                    .emit(
                        "usuario_escribiendo",
                        {
                            id:
                                socket.id,

                            nombre:
                                usuario.nombre
                        }
                    );
            }
        );


        /* =================================================
           USUARIO DEJÓ DE ESCRIBIR
        ================================================= */

        socket.on(
            "dejo_de_escribir",
            () => {

                const usuario =
                    usuarios.get(
                        socket.id
                    );


                if (!usuario) {

                    return;
                }


                socket
                    .to(
                        usuario.codigo
                    )
                    .emit(
                        "usuario_dejo_de_escribir",
                        {
                            id:
                                socket.id
                        }
                    );
            }
        );


        /* =================================================
           DESCONECTAR
        ================================================= */

        socket.on(
            "disconnect",
            reason => {

                const usuario =
                    usuarios.get(
                        socket.id
                    );


                if (!usuario) {

                    console.log(
                        "Usuario desconectado:",
                        socket.id
                    );

                    return;
                }


                const codigo =
                    usuario.codigo;


                const nombre =
                    usuario.nombre;


                usuarios.delete(
                    socket.id
                );


                /*
                   Quitamos el socket
                   asociado a suscripciones.
                */

                for (
                    const datosPush
                    of suscripcionesPush.values()
                ) {

                    if (
                        datosPush &&
                        datosPush.socketId ===
                            socket.id
                    ) {

                        datosPush.socketId =
                            null;
                    }
                }


                socket
                    .to(
                        codigo
                    )
                    .emit(
                        "usuario_dejo_de_escribir",
                        {
                            id:
                                socket.id
                        }
                    );


                socket
                    .to(
                        codigo
                    )
                    .emit(
                        "usuario_sale",
                        {
                            id:
                                socket.id,

                            nombre:
                                nombre
                        }
                    );


                actualizarParticipantes(
                    codigo
                );


                console.log(
                    `${nombre} salió del chat ${codigo}`
                );


                console.log(
                    "Motivo:",
                    reason
                );
            }
        );
    }
);


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

server.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            "          CHATPRIV"
        );

        console.log(
            "================================"
        );

        console.log(
            `Servidor: http://localhost:${PORT}`
        );

        console.log(
            `LAN: http://192.168.1.150:${PORT}`
        );

        console.log(
            "Socket.IO: ACTIVO"
        );

        console.log(
            "Escribiendo: ACTIVO"
        );

        console.log(
            "Mensajes: ACTIVO"
        );

        console.log(
            "Participantes: ACTIVO"
        );

        console.log(
            "Web Push: ACTIVO"
        );

        console.log(
            "Servidor esperando usuarios..."
        );

        console.log(
            "================================"
        );

        console.log("");
    }
);