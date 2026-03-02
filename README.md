# DevDayChallengeAI

## Link del frontend
```
https://devdaychallengeai-1.onrender.com/
```
## Requisitos


Antes de correr el proyecto, instala estas herramientas.

### Instalar Volta

Unix:

```bash
curl https://get.volta.sh | bash
```

Windows:

```bash
winget install Volta.Volta
```

### Instalar Node y pnpm

```bash
volta install node
volta install pnpm
```

## Como ejecutar el proyecto

Desde la raiz del repositorio:

```bash
pnpm install
pnpm run dev
```

Esto levanta el monorepo en modo desarrollo (frontend y backend en paralelo).

## Arquitectura general

Este proyecto esta organizado como un **monorepo**:

- `apps/`: contiene las aplicaciones principales.
- `packages/`: contiene modulos compartidos entre aplicaciones.

Dentro de `apps/`:

- `apps/web`: frontend.
- `apps/api`: backend.

Dentro de `packages/`:

- `packages/shared`: codigo y contratos reutilizables por frontend y backend.

## Arquitectura del backend

El backend (`apps/api`) usa una arquitectura por capas inspirada en **Clean Architecture** para separar reglas de negocio de detalles tecnicos.

### Que es Clean Architecture

Clean Architecture es una forma de organizar el codigo para que:

- Las reglas de negocio sean el centro del sistema.
- El dominio no dependa de frameworks, HTTP, base de datos o proveedores externos.
- Los detalles de infraestructura puedan cambiar sin romper la logica principal.

Regla principal: las dependencias siempre apuntan hacia adentro (hacia `domain` y `application`), nunca al reves.

### Capas del backend en este proyecto

- `domain/`: entidades, modelos y reglas de negocio puras.
- `application/`: casos de uso, orquestacion del flujo y manejo de errores de aplicacion.
- `http/`: entrada/salida HTTP (rutas, request/response, validacion de borde).
- `infrastructure/`: implementaciones concretas (integracion con LLM, sesiones, herramientas externas, repositorios/adaptadores).

### Por que se eligio esta arquitectura

- Facilita mantenimiento: cada capa tiene una responsabilidad clara.
- Mejora testeo: dominio y casos de uso se pueden probar sin levantar Fastify ni servicios externos.
- Reduce acoplamiento: cambiar proveedor LLM o persistencia afecta `infrastructure`, no el dominio.
- Escala mejor: permite agregar endpoints, casos de uso o integraciones sin mezclar logica.
- Favorece colaboracion: el equipo puede trabajar por capas con menos conflictos.

## Arquitectura del frontend

El frontend (`apps/web`) se planteo como una arquitectura **simple y practica** porque la aplicacion es de una sola pagina principal (SPA).

En lugar de una estructura compleja por modulos grandes, se separo por responsabilidades para mantener claridad y velocidad de desarrollo.

### Por que se eligio una arquitectura simple

- La app tiene un flujo principal en una sola pagina.
- Se priorizo rapidez de iteracion y facilidad de mantenimiento.
- Evita sobreingenieria para un alcance acotado.
- Mantiene el codigo ordenado y facil de escalar cuando crezcan nuevas vistas.

### Separacion de responsabilidades en frontend

- `pages/`: vistas o pantallas de la aplicacion.
- `components/`: componentes reutilizables de interfaz.
- `services/`: llamadas HTTP y logica de comunicacion con el backend.
- `state/`: manejo de estado de la UI y del flujo.
- `lib/`: utilidades y funciones compartidas.
- `styles/`: estilos globales y temas visuales.
- `app/`: configuracion base y composicion general de la aplicacion.

Con esta organizacion se logra que cada carpeta tenga un objetivo claro: las vistas renderizan, los componentes componen UI, y los servicios encapsulan integraciones.

## Estructura de carpetas

```text
DevDayChallengeAI/
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ application/      # Casos de uso y logica de aplicacion
│  │     ├─ domain/           # Entidades y reglas de negocio
│  │     ├─ http/             # Rutas y capa HTTP
│  │     └─ infrastructure/   # Integraciones externas (LLM, storage, etc.)
│  └─ web/
│     ├─ public/              # Archivos estaticos
│     └─ src/
│        ├─ app/              # Configuracion base de la app
│        ├─ components/       # Componentes de UI reutilizables
│        ├─ pages/            # Vistas/paginas
│        ├─ services/         # Clientes y llamadas a API
│        ├─ state/            # Estado global/local
│        ├─ styles/           # Estilos globales
│        └─ lib/              # Utilidades y helpers
└─ packages/
   └─ shared/
      └─ src/
         └─ contracts/        # Tipos y contratos compartidos
```

## Scripts utiles (raiz)

```bash
pnpm run dev      # Levanta frontend + backend
pnpm run dev:web  # Levanta solo frontend
pnpm run dev:api  # Levanta solo backend
pnpm run build    # Build de todos los paquetes/apps
```

## Actividades por integrante

> Basado en historial de commits del repositorio.

- Javier Estrada
  - Estructura inicial del proyecto (monorepo y base del backend).
  - Definicion de schemas/contratos de API y refactors de rutas y tipos.
  - Integracion de persistencia y ajustes de configuracion (URLs y puertos).
  - Refactors funcionales en backend para estabilizar flujo conversacional.

- Byron Josue Alejandro Coc Palomo
  - Mejoras y refactorizacion del frontend (componentes y flujo de UI).
  - Ajustes de dependencias y correcciones de integracion entre modulos.
  - Implementacion de integracion con canal Telegram.
  - Ajustes finales de configuracion y consolidacion de cambios.
