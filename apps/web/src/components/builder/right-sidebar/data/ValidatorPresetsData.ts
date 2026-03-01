import type { ValidatorPreset } from "../interfaces/ValidatorPreset";

const VALIDATOR_PRESETS: ValidatorPreset[] = [
  {
    key: "faq",
    label: "Consultas Generales",
    fields: ["tipoCliente", "situacionLaboral", "edadAproximada"],
    instructions:
      "Recopila perfil base del cliente antes de responder preguntas generales del negocio."
  },
  {
    key: "catalogo",
    label: "Catalogo Vehiculos",
    fields: ["presupuesto", "condicionVehiculo", "descuentoEmpleado", "tipoVehiculo"],
    instructions:
      "Valida datos del cliente para recomendar vehiculos segun perfil y presupuesto."
  },
  {
    key: "agenda",
    label: "Agendamiento Cita",
    fields: ["nombreCompleto", "fechaPreferida", "horaPreferida", "motivoCita", "vehiculoInteres"],
    instructions:
      "Solicita datos completos para confirmar cita de prueba de manejo o asesoria."
  }
];

export { VALIDATOR_PRESETS };
