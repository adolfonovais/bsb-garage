// Service worker do Garage Flow — só cuida das notificações push do WhatsApp.

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { title: "Garage Flow", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(dados.title || "Garage Flow", {
      body: dados.body || "",
      icon: "/brand/garage-flow/icons/app-blue-192.png",
      badge: "/brand/garage-flow/icons/app-blue-192.png",
      tag: dados.tag || "garage-flow",
      data: { url: dados.url || "/whatsapp" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/whatsapp";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          janela.navigate(destino);
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
