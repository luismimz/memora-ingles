// Only brand native invitations. Never change recipients, tokens, roles or URLs.
export default function register({ filter }, { env }) {
  filter('email.send', (payload) => {
    if (payload?.template?.name !== 'user-invitation') return payload;
    const url = payload.template.data?.url;
    const address = typeof payload.from === 'object'
      ? payload.from?.address
      : payload.from || env.EMAIL_FROM;
    return {
      ...payload,
      ...(typeof address === 'string' && address ? { from: { name: 'Memora', address } } : {}),
      // Respect an explicitly supplied subject; translate Directus' default only.
      subject: !payload.subject || payload.subject === "You've been invited"
        ? 'Tu aventura en Memora empieza aquí'
        : payload.subject,
      ...(typeof url === 'string' ? {
        text: `MEMORA — Tu aventura en inglés\n\nTe han invitado a Memora. Aprende inglés con imágenes, historias y juegos, a tu ritmo.\n\nActiva tu cuenta y elige tu contraseña:\n${url}\n\nDespués, entra en https://ingles.luismontalvan.com/ con tu correo y tu contraseña.\n\nEste enlace es personal: no lo compartas. Si no esperabas esta invitación, puedes ignorar este correo.`,
      } : {}),
    };
  });
}
