# 🐾 PetTracker

**App móvil Local-First para el seguimiento de salud y paseos de mascotas**, con análisis clínico de deposiciones, historial de paseos con GPS, sincronización en la nube y alertas de salud intestinal.

![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-blue)

---

## 📖 Descripción

PetTracker es una app clínica y de paseo para dueños de mascotas, pensada para funcionar primero y siempre en local — sin depender de conexión a internet — y sincronizarse con la nube (Supabase) en segundo plano cuando hay red disponible.

Permite gestionar varias mascotas por usuario, registrar paseos con trazado GPS, anotar cada deposición (consistencia + color clínico) durante el paseo, y obtener un dashboard de salud intestinal de 7/30 días que se puede exportar y compartir con el veterinario. Si se detectan varias deposiciones de diarrea seguidas, la app lanza automáticamente una alerta local recomendando consultar al veterinario.

## 🏗️ Arquitectura (Hexagonal / Puertos y Adaptadores)

El proyecto sigue estrictamente una arquitectura hexagonal de 4 capas, con dependencias que siempre apuntan hacia el dominio:

```
┌────────────────────────────────────────────────────────────────┐
│ PRESENTATION                                                    │
│ Screens (Login, Walk, Profile) · Contextos de React             │
│ (DependencyContext = inyección de dependencias,                 │
│  ActivePetContext = mascota activa + bloqueo durante paseo)      │
└───────────────────────────┬──────────────────────────────────────┘
                             │ depende de casos de uso, nunca de infra
┌───────────────────────────▼──────────────────────────────────────┐
│ APPLICATION (Casos de uso)                                       │
│ RecordDroppingUseCase · StartWalkUseCase · EndWalkUseCase ·      │
│ GetActiveWalkUseCase · SavePetUseCase/GetPetsUseCase ·            │
│ CheckIntestinalHealthAlertUseCase ·                               │
│ ScheduleWalkReminderUseCase / CancelWalkReminderUseCase           │
└───────────────────────────┬──────────────────────────────────────┘
                             │ orquesta entidades a través de puertos
┌───────────────────────────▼──────────────────────────────────────┐
│ DOMAIN                                                            │
│ Entidades: Pet · Dropping · Walk · User                          │
│ Value Objects: Location (distancia Haversine)                    │
│ Puertos (interfaces): IPetRepository · IDroppingRepository ·      │
│ IWalkRepository · IAuthService · IGpsService ·                   │
│ IImagePickerService · INotificationService                       │
└───────────────────────────▲──────────────────────────────────────┘
                             │ implementados por
┌───────────────────────────┴──────────────────────────────────────┐
│ INFRASTRUCTURE                                                    │
│ AsyncStorage*Repository (local, fuente de verdad inmediata)       │
│ Supabase*Repository (remoto) + Synced*Repository (decorador      │
│   local-first) + SyncQueue (outbox) + SyncManager (reintentos)    │
│ ExpoGpsAdapter · ExpoImagePickerAdapter · ExpoNotificationAdapter │
│ SupabaseAuthAdapter / MockAuthAdapter                             │
└────────────────────────────────────────────────────────────────┘
```

La capa de presentación nunca importa nada de `infrastructure` directamente: todo pasa por los puertos definidos en `domain/ports`, inyectados vía `DependencyContext`. Esto permite, por ejemplo, cambiar `AsyncStorage` por Supabase (o un backend futuro) sin tocar una sola pantalla.

```
src/
├── domain/            # Entidades, value objects y puertos (interfaces)
├── application/       # Casos de uso: la lógica de negocio pura
├── infrastructure/     # Adaptadores concretos (AsyncStorage, Supabase, Expo*, sync)
└── presentation/       # Screens, componentes y contextos de React
```

## ✨ Características principales

- **🐶 Multi-mascota**: cada usuario gestiona varias mascotas, con una "mascota activa" compartida de forma reactiva entre las pantallas de Paseo y Perfil.
- **🗺️ Paseos con GPS y distancia real**: trazado de ruta en mapa, con cálculo de distancia mediante la **fórmula de Haversine** y duración real del paseo (persistido una sola vez al finalizar, no en cada punto GPS).
- **🎨 Selector cromático continuo**: un `ColorGradientPicker` por slider (no categorías fijas) para registrar el color de cada deposición con precisión clínica, traducido después a una etiqueta por distancia euclidiana en espacio RGB.
- **📊 Dashboard clínico de 7/30 días**: resumen semanal de consistencias (normal/blanda/dura/diarrea) en el perfil, más un informe de 30 días exportable.
- **📤 Exportación nativa para el veterinario**: genera un informe de texto formateado (resumen, desglose por consistencia, anomalías) y lo comparte vía la `Share` API nativa (WhatsApp, email, notas...).
- **🔁 Resiliencia a paseos huérfanos**: si la app se cierra a mitad de un paseo, se detecta al reabrir y se ofrece cerrarlo automáticamente o continuarlo, sin dejar la mascota bloqueada.
- **☁️ Sincronización Local-First con Supabase**: cada guardado escribe primero en `AsyncStorage` (la app nunca se bloquea por falta de red) y se sincroniza con Supabase en segundo plano mediante un patrón **decorador** (`Synced*Repository`) + una cola de sincronización persistida (`SyncQueue`) que reintenta automáticamente al recuperar la conexión.
- **⚠️ Alertas de salud intestinal**: si se detectan 2 o más deposiciones de diarrea consecutivas, se dispara una notificación local inmediata recomendando consultar al veterinario.
- **🔔 Recordatorios de paseo**: notificación diaria programable a la hora habitual de paseo.

## 🧰 Tech Stack

| Capa | Tecnología |
|---|---|
| App móvil | React Native 0.88 + Expo SDK 58 (TypeScript) |
| Navegación | React Navigation (bottom tabs) |
| Mapas / GPS | `react-native-maps`, `expo-location` |
| Almacenamiento local | `@react-native-async-storage/async-storage`, `expo-secure-store` (sesión) |
| Backend / Nube | Supabase (Postgres + Auth + Row Level Security) |
| Conectividad | `@react-native-community/netinfo` |
| Notificaciones | `expo-notifications` |
| i18n | `i18next` / `react-i18next` (es/en/va) |
| Testing | Jest + `jest-expo` |

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone <URL-de-tu-repositorio>
cd pet-tracker
npm install
```

### 2. Configurar las variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con los datos de tu proyecto Supabase (Project Settings → API):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

> Si no configuras `.env`, la app sigue funcionando **100% en local** (sesión simulada + `AsyncStorage`), sin romperse al arrancar — útil para desarrollar sin depender de un backend.

### 3. Desplegar el backend en Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** del proyecto.
3. Pega y ejecuta el contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

Esto crea las tablas `pets`, `walks` y `droppings`, con **Row Level Security** habilitada para que cada usuario solo pueda ver/editar sus propios datos (`auth.uid() = user_id`), triggers de `updated_at` y columnas `deleted_at` preparadas para futuras eliminaciones sincronizadas.

### 4. Ejecutar la app

```bash
npx expo start
```

Desde ahí puedes abrirla en un emulador/dispositivo, o usar directamente:

```bash
npm run android   # Android
npm run ios        # iOS
npm run web        # Web
```

### 5. Ejecutar los tests

```bash
npm test
```

(o `npm run test:watch` en modo watch). El proyecto cuenta con una suite de más de 60 tests (Jest) cubriendo entidades de dominio, casos de uso, adaptadores locales y remotos, y el pipeline de sincronización.

## 🗺️ Estado del proyecto

- ✅ Dominio y arquitectura hexagonal (entidades, puertos, casos de uso)
- ✅ Persistencia local completa (mascotas, deposiciones, paseos)
- ✅ Sincronización Local-First con Supabase (Pet, Dropping, Walk)
- ✅ Notificaciones locales (alertas clínicas + recordatorios de paseo)
- 🔜 Subida de fotos de perfil a Supabase Storage (por ahora solo rutas locales)
- 🔜 Pull/merge de cambios remotos entre varios dispositivos (hoy la sincronización es local → nube)

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
