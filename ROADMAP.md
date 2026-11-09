# Roadmap de Pet Tracker

_Última actualización: 9 de noviembre de 2026_

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
- [ ] **Lanzar build de producción con todos los cambios acumulados**
- [ ] Subir a Pruebas internas y repartir a los testers

## Fase 1 — Feedback de testers

Recoger lo que digan los testers y clasificarlo en dos cestas:

**Bugs / fallos** (arreglar siempre antes de publicar):

- Cualquier crash, dato que no se guarda, pantalla rota, etc.

**Mejoras menores** (si son rápidas, caben antes de publicar; si no, pasan a
la Fase 2 o se anotan para más adelante):

- Ajustes de UX ya detectados por ti:
  - Rediseñar visualmente la tarjeta de comida/medicina (hecho a nivel
    funcional, falta pulir el diseño)
  - Perfil de mascota: seguir mejorando la presentación general
  - Rellenar ficha de Play Store (nombre, descripción, icono 512×512,
    capturas reales — las mockups actuales son de referencia)

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
