// Guion de ejemplo (no gasta API). Sirve para ver el estilo y como plantilla.
export const GUION_EJEMPLO = {
  titulo: "Dos fines de semana",
  tema: "bosque",
  escenas: [
    {
      duracion: 3.4,
      texto: "*Mismo* sueldo. *Mismo* cansancio.",
      narracion: "Andrés y Camila tienen el mismo trabajo, el mismo sueldo y el mismo cansancio acumulado de toda la semana.",
      elementos: [
        { tipo: "persona", x: 330, y: 1120, tam: 400, entrada: "dibujar", inicio: 0.2, etiqueta: "ANDRÉS" },
        { tipo: "persona", x: 750, y: 1120, tam: 400, entrada: "dibujar", inicio: 0.6, etiqueta: "CAMILA" },
        { tipo: "linea", x: 540, y: 880, x2: 540, y2: 1400, punteada: true, entrada: "dibujar", inicio: 1 },
      ],
    },
    {
      duracion: 3.6,
      texto: "*Dos decisiones* muy distintas",
      narracion: "Pero llega el viernes y cada uno toma una decisión muy distinta.",
      elementos: [
        { tipo: "caja", x: 330, y: 900, ancho: 340, alto: 120, etiqueta: "CIUDAD", inicio: 0.3 },
        { tipo: "caja", x: 750, y: 900, ancho: 340, alto: 120, etiqueta: "EARTH PARK", acento: true, inicio: 0.7 },
        { tipo: "persona", x: 330, y: 1230, tam: 260, entrada: "aparecer", inicio: 0 },
        { tipo: "persona", x: 750, y: 1230, tam: 260, entrada: "aparecer", inicio: 0, acento: true },
      ],
    },
    {
      duracion: 4,
      texto: "Andrés se queda en la *ciudad*",
      narracion: "Andrés se queda. Centro comercial, trancón y horas mirando el celular.",
      elementos: [
        { tipo: "edificios", x: 540, y: 1000, tam: 460, inicio: 0.2 },
        { tipo: "carro", x: 300, y: 1380, tam: 200, entrada: "deslizar_izq", inicio: 0.8, efecto: "temblar" },
        { tipo: "celular", x: 780, y: 1360, tam: 230, entrada: "pop", inicio: 1.3, efecto: "latir" },
      ],
    },
    {
      duracion: 3.6,
      texto: "Lunes: *más cansado*",
      narracion: "El lunes llega al trabajo más cansado que el viernes. Su energía, casi en cero.",
      elementos: [
        { tipo: "puntos", x: 540, y: 1080, total: 10, activos: 2, columnas: 5, radio: 40, inicio: 0.3 },
        { tipo: "texto", x: 540, y: 1430, texto: "Energía: *20%*", tam: 70, inicio: 1.2, entrada: "aparecer" },
      ],
    },
    {
      duracion: 4.2,
      texto: "Camila sale al *Valle de Tenza*",
      narracion: "Camila, en cambio, sale de Bogotá rumbo al Valle de Tenza, en Boyacá.",
      elementos: [
        { tipo: "ruta", x: 540, y: 1080, tam: 600, inicio: 0.2, acento: true },
        { tipo: "pin", x: 330, y: 1290, tam: 130, entrada: "pop", inicio: 0.4, etiqueta: "BOGOTÁ" },
        { tipo: "pin", x: 760, y: 870, tam: 130, entrada: "pop", inicio: 1.2, acento: true, etiqueta: "MACANAL" },
      ],
    },
    {
      duracion: 4.2,
      texto: "*Embalse*, fogata y silencio",
      narracion: "Lancha en el embalse, fogata en la noche y un cielo sin ruido.",
      elementos: [
        { tipo: "montanas", x: 540, y: 980, tam: 520, inicio: 0.1 },
        { tipo: "agua", x: 540, y: 1260, tam: 520, inicio: 0.5, entrada: "aparecer" },
        { tipo: "lancha", x: 360, y: 1230, tam: 180, entrada: "aparecer", inicio: 1, mover: { x: 720, y: 1230, inicio: 1.4, duracion: 2.5 } },
        { tipo: "luna", x: 860, y: 780, tam: 120, entrada: "aparecer", inicio: 1.4, acento: true, efecto: "flotar" },
      ],
    },
    {
      duracion: 3.8,
      texto: "Ella vuelve *con energía*",
      narracion: "El lunes, ella vuelve con energía. Él no.",
      elementos: [
        { tipo: "barras", x: 540, y: 1150, valores: [20, 90], etiquetas: ["ANDRÉS", "CAMILA"], ancho: 640, alto: 460, destacar: 1, inicio: 0.4 },
      ],
    },
    {
      duracion: 3.6,
      texto: "Descansar es *cambiar de paisaje*",
      narracion: "Porque descansar no es quedarse quieto. Es cambiar de paisaje.",
      elementos: [
        { tipo: "mariposa", x: 540, y: 1150, tam: 380, inicio: 0.3, acento: true, efecto: "flotar" },
      ],
    },
  ],
  cta: { palabra: "PLAN", texto: "¿Quieres el plan de Camila?", narracion: "¿Quieres el plan de fin de semana de Camila? Comenta plan y te lo enviamos." },
  caption: "Mismo cansancio, dos decisiones. ¿Tú cuál tomas este puente? 🦋\nComenta PLAN y te enviamos la ruta completa a Earth Park, en el Valle de Tenza.",
  hashtags: ["#EarthPark", "#ValleDeTenza", "#Boyaca", "#Glamping", "#PlanesBogota", "#Desconexion"],
  musica: "Lo-fi suave o acústico tranquilo; en Instagram busca un audio en tendencia de 'calma' o 'storytelling'.",
};
