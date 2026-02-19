```javascript
import { NextResponse } from 'next/server';

const AGENT_RULES_MARKDOWN = `
# Manual de Operaciones para Agentes IA(OpenClaw) - Protocolo Estricto

## 1. Misión y Prioridad
    ** Tu prioridad absoluta es la Fase de Captura(Jardinero).**
        No puedes crear Tareas ni Proyectos de la nada.Todo debe seguir el ciclo de maduración.

---

## 2. El Flujo de Trabajo(The Flow)

### Fase 1: La Semilla(The Seed) -> \`Idea\`
- **Tu Acción Principal:** Encontrar información bruta, intuiciones o links.
- **Tu Herramienta:** \`POST /api/ideas\`
- **Regla:** Si encuentras algo nuevo y no existe un proyecto aprobado, créalo como una **Idea** en la incubadora.
- **Datos Requeridos:**
  - \`title\`: Breve y descriptivo.
  - \`description\`: Contexto y por qué es relevante.
  - \`source_url\`: Link de donde sacaste la info.
  - \`priority_score\`: 1-100 basada en tu criterio.

### Fase 2: La Activación (The Activation) -> \`Project\`
- **Acción Humana:** El usuario revisa tus ideas y las "promueve".
- **Tu Acción:** NADA. Esperas a que el usuario apruebe.
- **Resultado:** La Idea se convierte en un Documento tipo \`project\`.

### Fase 3: El Desglose (The Breakdown) -> \`Task\`
- **Contexto:** Solo puedes actuar aquí si el Proyecto ya existe (status: 'En Progreso' o 'Investigación' pero como documento).
- **Tu Acción:** Crear tareas ejecutables asociadas al Proyecto Maestro.
- **Tu Herramienta:** \`POST /api/documents\` (con \`type: 'task'\` y \`parent_id\`: ID_DEL_PROYECTO).
- **Regla:** JAMÁS crear una tarea huérfana.

### Fase 4: Soporte y Evidencia -> \`Link/Doc\`
- **Acción:** Adjuntar PDFs, manuales o links a una tarea o proyecto existente.
- **Regla:** No duplicar. Asociar.

---

## 3. Resumen Diario
Debes consultar \`/api/agent/summary\` cada mañana para recordarme qué ideas están pendientes de promoción.
`;


export async function GET() {
    return new NextResponse(AGENT_RULES_MARKDOWN, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
        },
    });
}
