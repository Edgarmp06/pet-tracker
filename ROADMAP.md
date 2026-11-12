# Roadmap de Pet Tracker

_Última actualización: 12 de noviembre de 2026_

**Fase 0 y Fase 1 confirmadas por el usuario en build 13: todo funcionando.**
Empieza la Fase 2 (ficha de Play Store, antes de publicar en abierto).

Ruta a seguir desde el build actual (con el fix de crash, mapa, logo y las
mejoras de comida/medicina/historial) hasta tener una versión con clientes
reales y planificar mejoras grandes tipo Premium.

## Fase 0 — Ahora: cerrar el build de pruebas internas

- [x] Fix del crash de arranque (ProGuard/WorkManager)
- [x] API key de Google Maps añadida y restringida
- [x] Logo real en la pantalla de login
- [x] Formulario de comida/medicina con recordatorio de próxima dosis
      (personalizable, días/horas libres)
- [x] Historial completo de la mascota (comida, medicina, deposiciones) al
      tocar su foto
- [x] Recordatorio de paseo ajustable minuto a minuto
- [x] **Lanzar build de producción con todos los cambios acumulados**
- [x] Subir a Pruebas internas y repartir a los testers
- [x] Fix del mapa en gris (API key de Maps duplicada/obsoleta en EAS, ya
      resuelto — el build 10 lo lleva bien)

## Fase 1 — Feedback de testers

Recoger lo que digan los testers y clasificarlo en dos cestas:

**Bugs / fallos** (arreglar siempre antes de publicar):

- [x] El teclado tapaba los campos al registrar/crear mascota (login,
      registro, alta de mascota, comida/medicina) — añadido
      `KeyboardAvoidingView` + scroll en los formularios afectados
- [x] Icono de ojo 👁️ para mostrar/ocultar la contraseña en login/registro
- [x] Botón "Finalizar Paseo" tapado por la barra de navegación del
      sistema en algunos móviles (reportado en Samsung S22/S23) —
      `WalkScreen` no usaba `insets.bottom`, solo un padding fijo; ahora el
      padding inferior se ajusta a cada dispositivo y, por si acaso, la
      pantalla es desplazable (scroll) para que el botón nunca quede
      inalcanzable
- [x] "¿Quién lo hizo?" (caca durante paseo con varias mascotas) pre-marcaba
      en verde la primera mascota de la lista, como si ya estuviera elegida
      — ahora funciona igual que el selector de inicio de paseo: no hay
      preselección, tocas para elegir y confirmas con el botón

**Mejoras menores** (si son rápidas, caben antes de publicar; si no, pasan a
la Fase 2 o se anotan para más adelante):

- [x] Gatos que no salen de paseo: al crear el perfil se pregunta "¿sueles
      sacarlo a pasear?"; si es que no, no aparece en el flujo de paseo
      (solo comida/medicina/deposiciones desde su perfil)
- [x] Deposición fuera de paseo: en vez de solo GPS, se puede elegir un
      sitio ("En casa", "Terraza", "Patio/Jardín" u "Otro sitio" con texto
      libre)
- [x] Comida: cantidad como número + unidad seleccionable (g, kg, lata,
      ración, taza) en vez de un solo campo de texto libre, y recordatorio
      de próxima comida (igual que medicina ya tenía para la próxima dosis)
- [x] Historial de la mascota: ahora incluye también los paseos (km
      recorridos y duración), no solo comida/medicina/deposiciones
- [x] **Comida/Medicina como pantalla propia** en vez de modal — ahora vive
      en una pila de navegación anidada dentro de la pestaña Perfil
      (`PetEventScreen`, con su propio header y botón de volver)
- [x] **Rediseño visual (primera pasada)**: sustituidos los emojis usados
      como iconos de interfaz (ajustes, flechas, avatares sin foto, mapa de
      calor, compartir, gráficas, historial, tema claro/oscuro/sistema,
      cerrar sesión, selector de especie/género...) por iconos de
      `@expo/vector-icons` (Ionicons + MaterialCommunityIcons). Se
      mantienen a propósito los emojis "de marca" (💩🍖💊 en los botones de
      registro rápido y las etiquetas de consistencia), que son parte del
      tono simpático de la app, no un descuido. **Pendiente de verificar en
      pantalla real** (sin emulador/dispositivo disponible esta noche).
- Rediseñar visualmente la tarjeta de comida/medicina — resuelto al
  convertirla en pantalla propia (`PetEventScreen`); si sigue viéndose
  pobre una vez la veas en el móvil, se afina espaciado/tarjetas en una
  siguiente pasada con capturas reales delante
- Perfil de mascota: seguir mejorando la presentación general
- [ ] **Pendiente de probar mañana**: teclado tapando campos (ya debería
      estar resuelto con `behavior="height"` en Android, falta confirmar
      en build nuevo — ver más abajo en "Bugs")
- [x] **Mapa de calor por mascota en paseo conjunto**: confirmado el bug —
      siempre usaba la mascota "activa" del perfil, no una de las que
      realmente estaban paseando. Ahora, si hay más de una mascota
      paseando, pregunta antes "¿de qué mascota?" (igual que "¿Quién lo
      hizo?") y el título del mapa muestra el nombre de la mascota
- Rellenar ficha de Play Store (nombre, descripción, icono 512×512,
  capturas reales — las mockups actuales son de referencia; el usuario lo
  hará esta semana)

## Fase 2 — Antes de publicar en abierto

Con los bugs y mejoras menores ya resueltos:

- [ ] Capturas de pantalla **reales** de la app (sustituir los mockups)
- [ ] Ficha de Play Store completa y enviada a revisión
- [ ] Revisar textos legales (privacidad/términos) contra la versión final
      de la app, por si cambió algo de los datos que se recogen
- [ ] Probar el flujo completo una vez más de principio a fin (registro,
      login, paseo, comida, medicina, perfil, borrar cuenta)
- [ ] Publicar en producción (no solo pruebas internas)

## Fase 3 — Primeras descargas reales

Objetivo: observar uso real antes de construir nada grande.

- [ ] Vigilar Android vitals (fallos y ANR) en Play Console con usuarios reales
- [ ] Arreglar lo que surja con prioridad alta (igual que en Fase 1)
- [ ] Recoger valoraciones/reseñas y feedback informal
- [ ] Decidir, con datos reales de uso, qué funciones grandes merecen la
      pena (no todas las ideas de abajo, solo las que la gente pida o use)

## Fase 4 — Mejoras grandes (con tracción ya validada)

Ideas para cuando haya una base de usuarios real que las justifique.
Ordenadas de más a menos evidentes como primer paso hacia Premium:

### Candidatas a función Premium / monetización

- **Mascotas ilimitadas** (gratis: 1-2 mascotas, premium: ilimitadas)
- **Informes PDF exportables** para el veterinario (ahora solo se comparte
  texto/resumen)
- **Estadísticas avanzadas / tendencias de salud** (gráficas más completas,
  comparativas entre mascotas, alertas inteligentes)
- **Recordatorios avanzados** (varios al día, recurrentes con reglas
  complejas, no solo "en X días/horas")
- **Compartir mascota con otro cuidador** (familia, paseador, pareja) con
  su propio login viendo el mismo historial
- **Copia de seguridad y sincronización multi-dispositivo** (ya hay
  Supabase de base; premium podría ampliar histórico, backups, etc.)

### Mejoras técnicas / de producto (no necesariamente de pago)

- Build para **iOS** (ahora mismo el proyecto solo se ha compilado para
  Android)
- **Reporte de errores en producción** (Sentry o similar) para enterarte de
  crashes reales sin depender de que el usuario te escriba
- **Analítica de uso** básica y respetuosa con la privacidad (qué
  pantallas/funciones se usan más, para priorizar con datos)
- Onboarding/tutorial guiado para usuarios nuevos
- Exportar rutas de paseo en formato GPX/KML
- Widget de pantalla de inicio (próximo paseo, última comida, etc.)
- Internacionalización completa (ya hay base en es/va/en, falta cobertura
  total de pantallas)

## Cómo usar este documento

- Cada vez que cerremos una fase o añadamos algo nuevo al backlog, lo
  actualizamos aquí en vez de dejarlo solo en el chat.
- Las casillas `[x]` / `[ ]` sirven para ver de un vistazo qué falta.
- Las ideas de la Fase 4 son candidatas, no compromisos: se eligen según lo
  que pidan o usen los usuarios reales, no por orden de la lista.
