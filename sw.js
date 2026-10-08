"use strict";

self.addEventListener(
    "push",
    event => {

        let datos = {
            titulo: "ChatPriv",
            mensaje: "Tienes un nuevo mensaje."
        };

        try {

            if (event.data) {

                datos =
                    event.data.json();

            }

        } catch (error) {

            console.error(
                "Error leyendo notificación:",
                error
            );
        }


        const opciones = {

            body:
                datos.mensaje ||
                "Tienes un nuevo mensaje.",

            icon: "/icon-192.png",

            badge: "/icon-192.png",

            vibrate: [
                200,
                100,
                200
            ],

            data: {
                url: "/"
            },

            tag:
                datos.tag ||
                "chatpriv-mensaje",

            renotify: true
        };


        event.waitUntil(

            self.registration.showNotification(
                datos.titulo ||
                "ChatPriv",
                opciones
            )

        );
    }
);


self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            }).then(
                ventanas => {

                    for (
                        const ventana
                        of ventanas
                    ) {

                        if (
                            "focus"
                            in ventana
                        ) {

                            return ventana.focus();
                        }
                    }


                    if (
                        clients.openWindow
                    ) {

                        return clients.openWindow(
                            "/"
                        );
                    }
                }
            )
        );
    }
);