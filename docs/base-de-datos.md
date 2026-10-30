# Base de datos (Supabase)

Los archivos de `base-de-datos/` están numerados en el orden en que se crearon. Para montar el proyecto desde cero, córrelos en ese orden en Supabase → **SQL Editor**.

| Archivo | Tabla | Para qué |
|---|---|---|
| `01_chat_historial.sql` | chat_historial | Conversaciones del asistente |
| `02_fotos_publicas_web.sql` | fotos_publicas_web | Fotos de Drive que salen en la web pública |
| `03_video_pedidos.sql` | video_pedidos | Pedidos de edición de video |
| `04_marketing_agente.sql` | marketing_agente | Historial de los agentes (carruseles, guiones, investigación, avatares) |
| `05_contenido_plan.sql` | contenido_plan | Plan semanal de contenido y su estado |
| `06_contenido_plan_instagram.sql` | contenido_plan (cambios) | Columnas para publicar en Instagram |

**Almacenamiento:** el bucket `videos` (público) guarda los videos y fotos que se envían a Lu. El plan gratis permite archivos de máximo 50 MB y 1 GB en total.

Una tabla nueva va en un archivo nuevo con el siguiente número: `07_...sql`.
