import { createContext, useContext, useReducer, useEffect } from "react";
import { SEED_RESERVAS, SEED_EGRESOS } from "../data/seedData";

const STORAGE_KEY = "earthpark_v1";

/* Default shape for a single reserva — used as reference.
   ADD_RESERVA simply pushes action.payload, so these defaults
   are only informational (the payload must include all fields). */
const RESERVA_DEFAULTS = {
  es_historico: false,
  ingreso_total: 0,
  lineas_negocio: [],
  productos: [],
};

const initialState = {
  reservas: [],
  egresos:  [],
};

function reducer(state, action) {
  switch (action.type) {
    case "ADD_RESERVA":
      return { ...state, reservas: [...state.reservas, action.payload] };
    case "UPDATE_RESERVA":
      return {
        ...state,
        reservas: state.reservas.map(r =>
          r.reserva_id === action.payload.reserva_id ? action.payload : r
        ),
      };
    case "DELETE_RESERVA":
      return {
        ...state,
        reservas: state.reservas.filter(r => r.reserva_id !== action.reserva_id),
        egresos:  state.egresos.filter(e => e.reserva_id !== action.reserva_id),
      };
    case "ADD_EGRESO":
      return { ...state, egresos: [...state.egresos, action.payload] };
    case "DELETE_EGRESO":
      return {
        ...state,
        egresos: state.egresos.filter(e => e.egreso_id !== action.egreso_id),
      };
    case "UPDATE_EGRESO":
      return {
        ...state,
        egresos: state.egresos.map(e =>
          e.egreso_id === action.payload.egreso_id
            ? action.payload : e
        ),
      };
    case "LOAD_EGRESOS_HISTORICOS": {
      const existingIds = new Set(state.egresos.map(e => e.egreso_id));
      const nuevos = action.payload.filter(e => !existingIds.has(e.egreso_id));
      return { ...state, egresos: [...state.egresos, ...nuevos] };
    }
    case "LOAD_STATE":
      return action.payload;
    default:
      return state;
  }
}

const ReservasContext = createContext(null);

export function ReservasProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        dispatch({ type: "LOAD_STATE", payload: JSON.parse(saved) });
      } else {
        // Load seed data if localStorage is empty
        dispatch({
          type: "LOAD_STATE",
          payload: { reservas: SEED_RESERVAS, egresos: SEED_EGRESOS },
        });
      }
    } catch (_) {
      dispatch({
        type: "LOAD_STATE",
        payload: { reservas: SEED_RESERVAS, egresos: SEED_EGRESOS },
      });
    }
  }, []);

  useEffect(() => {
    if (state.reservas.length > 0 || state.egresos.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  return (
    <ReservasContext.Provider value={{ state, dispatch }}>
      {children}
    </ReservasContext.Provider>
  );
}

export const useReservas = () => useContext(ReservasContext);
