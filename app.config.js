// Extiende app.json en vez de duplicarlo: todo lo estático sigue en
// app.json, y aquí solo inyectamos en build-time lo que NO debe quedar en
// texto plano en el repo (público en GitHub), como la API key de Google
// Maps. Se lee de la variable de entorno GOOGLE_MAPS_API_KEY_ANDROID,
// definida como secreto en EAS (`eas secret:create`) y, para desarrollo
// local, en tu `.env` (que ya está en .gitignore).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID || '',
      },
    },
  },
});
