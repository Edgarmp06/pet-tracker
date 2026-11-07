# 🗺️ Roadmap de PetTracker

## Visión General

Tras cerrar la Fase 1 (los cimientos de la app) y la Fase 2 (observabilidad y análisis de salud), este documento recoge el estado actual del proyecto y el backlog priorizado de mejoras para una futura Fase 3.

## Estado Actual (Fases Completadas)

### Fase 1

- Arquitectura Hexagonal (domain / application / infrastructure / presentation).
- Estrategia Local-First con sincronización a Supabase.
- Gestión multi-mascota.
- Seguimiento de paseos por GPS, con cálculo de distancia mediante la fórmula de Haversine.
- Alertas de salud intestinal (detección de diarrea recurrente) y notificaciones locales.

### Fase 2

- Pipeline de CI/CD con GitHub Actions (tests, `tsc --noEmit` y validación de dependencias Expo en cada push/PR a `main`).
- Heatmap de zonas de deposición con selector de rango (7/30 días).
- Gráficas clínicas avanzadas (tendencia semanal y consistencia acumulada) en el Dashboard de Salud, con componentes nativos sin dependencias de terceros.

## Fase 3 — Backlog de Futuras Mejoras (Priorizado)

### Media Prioridad (Infraestructura & Media)

**Supabase Storage para avatares y fotos.** Subir las imágenes de perfil de las mascotas a un bucket de Supabase Storage con políticas RLS por `user_id`, en lugar de mantenerlas solo en el almacenamiento local del dispositivo. Esto permitirá que la foto de la mascota se vea igual al cambiar de dispositivo.

### Baja Prioridad (Optimización & Rendimiento)

**Compresión de rutas GPS largas.** Aplicar un algoritmo de simplificación de polilíneas (p. ej. Douglas-Peucker) o muestreo adaptativo antes de guardar la ruta en `EndWalkUseCase`, para reducir el peso del payload JSON tanto en `AsyncStorage` como en el campo `jsonb` de Supabase.

### Feature de Dominio

**Módulo de Salud Preventiva.** Control de vacunas, desparasitación interna/externa y tomas de medicación, con recordatorios locales reutilizando la infraestructura de `INotificationService` ya existente para los recordatorios diarios de paseo.

### Alta Complejidad / Rediseño de Arquitectura

**Sincronización bidireccional multi-usuario.** Rediseñar las políticas RLS y el esquema de base de datos (introduciendo, por ejemplo, un concepto de `household_id` o tabla `pet_members`) para permitir que varios miembros de una misma familia gestionen las mismas mascotas en tiempo real, con resolución avanzada de conflictos más allá del actual last-write-wins.

## Limitaciones Documentadas

- **iOS Google Maps API Key:** para que el Heatmap se renderice en una build de iOS (p. ej. publicada en la App Store), es necesario registrar y configurar una API Key de Google Maps en `app.json`. En Android funciona por defecto, sin configuración adicional.
