# Professionalization Roadmap

Fecha: 2026-03-25

## Objetivo

Llevar EpiEarth Tactics de prototipo funcional a proyecto profesional, con foco en estabilidad, arquitectura, experiencia de usuario y capacidad real de entrega.

## Prioridad 0: bloquear riesgos operativos

1. Recuperar el pipeline local.
   - `npm` no funciona en este entorno y no hay `node_modules`.
   - Resultado esperado: `npm install`, `npm run build` y `npm test` deben correr sin intervención manual.

2. Ordenar la estructura del proyecto.
   - El código está repartido entre raíz, `components/`, `services/`, `store/` y `src/test/`.
   - Resultado esperado: mover la app a una estructura consistente (`src/app`, `src/components`, `src/services`, `src/store`, `src/test`).

3. Definir una baseline de calidad.
   - Activar chequeos automáticos para typecheck, tests y build en cada cambio.
   - Resultado esperado: un comando único de validación y CI mínima.

## Prioridad 1: estabilizar el runtime

1. Limpiar side effects globales.
   - `App.tsx` registraba handlers globales y listeners sin cleanup.
   - Resultado esperado: montaje y desmontaje seguros, sin fugas de memoria ni dobles suscripciones.

2. Profesionalizar integración con Supabase.
   - Tipar el cliente, sacar `any`, revisar feature flags y evitar UI blocking dentro de servicios.
   - Resultado esperado: cliente predecible, errores trazables y cloud saves con comportamiento explícito.

3. Cerrar dependencias implícitas del navegador.
   - Revisar `window`, `alert`, `process.env` y otros globals usados directamente.
   - Resultado esperado: comportamiento claro en build, tests y producción.

## Prioridad 2: bajar deuda de arquitectura

1. Partir `constants.ts`.
   - Hoy mezcla datos de gameplay, assets, UI y reglas.
   - Resultado esperado: módulos separados por dominio (`data`, `config`, `assets`, `combat`).

2. Sacar lógica de negocio de componentes.
   - La UI debe renderizar, no resolver reglas ni estados complejos.
   - Resultado esperado: lógica en servicios puros o slices/selectores.

3. Refactorizar resolución de acciones y skills.
   - Pasar de condicionales gigantes a un sistema extensible por efecto/acción.
   - Resultado esperado: agregar skills sin tocar el motor central.

## Prioridad 3: producto y UX

1. Mejorar onboarding y navegación.
   - Pantalla inicial, feedback de carga, errores y flujo de partida deben sentirse consistentes.

2. Subir accesibilidad base.
   - Soporte de teclado, foco visible, labels y jerarquía visual.

3. Homogeneizar presentation layer.
   - Definir sistema visual: tipografía, spacing, estados, overlays, HUD y modales.

## Prioridad 4: disciplina de equipo

1. Agregar lint y formato.
   - Sin esto, el código deriva rápido.

2. Definir testing por capas.
   - Unit tests para reglas, tests de store para flujos críticos y smoke tests para pantallas clave.

3. Escribir ADRs cortos.
   - Documentar decisiones de arquitectura antes de refactors grandes.

## Siguiente sprint recomendado

1. Recuperar instalación y build local.
2. Reordenar árbol a `src/`.
3. Separar `constants.ts` en módulos chicos.
4. Tipar y sanear `supabaseClient`.
5. Dejar CI con typecheck + vitest + build.
