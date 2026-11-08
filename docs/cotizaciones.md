# Cotizaciones y Precios

## Primera vez (Supabase → SQL Editor)

1. Corre `base-de-datos/08_precios_y_cotizaciones.sql` (crea las tablas).
2. Corre `privado/08_datos_iniciales.sql` (actividades, costos, descuentos e itinerarios). Este archivo solo está en el PC: no se sube a GitHub.

## Cómo se usa

- **Precios**: aquí se cambian precios y costos de cada actividad, el itinerario y las fotos por defecto de cada plan, y los descuentos. Es la fuente única.
- **Cotizaciones → Nueva**: eliges el plan, las fechas y quiénes vienen (adultos, niños de 5+ y menores de 5, que no pagan). Puedes quitar o agregar actividades por día, cambiar el precio solo para esa cotización, elegir fotos (web, Drive o subidas) y editar el saludo.
- **PDF**: guarda la cotización, descarga la propuesta y deja una copia en Supabase Storage (`videos/cotizaciones/`) para enviarla por WhatsApp.
- Estados: Borrador → Aprobada → Enviada → Reservada (o Descartada). El agente de WhatsApp creará borradores con `origen = whatsapp` para que ustedes los aprueben.

## Reglas del cálculo (`src/modulos/comercial/calculo.js`, con pruebas en `tests/cotizacion.test.js`)

- Pagan los adultos y los niños de 5 años o más.
- "Por persona, por día" (asistencia al viajero) se junta en una sola línea.
- El descuento se aplica a las actividades; el guía va aparte y es opcional.
- Cada cotización guarda el precio y el costo del momento: si mañana cambia el catálogo, las cotizaciones viejas no cambian.
- El costo y el margen solo se ven en el panel, nunca en el PDF.
