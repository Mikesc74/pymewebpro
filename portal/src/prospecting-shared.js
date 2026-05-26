// prospecting-shared.js · constants shared by prospecting.js (Places-based bulk
// runner) and prospecting-deep.js (search-engine-based deep discovery). Lives
// here to avoid a circular import between those two.

// Slug → Spanish Places textQuery / search-engine query a real business would
// be listed under. Single source of truth for both prospectors.
export const INDUSTRY_SEEDS = {
  // Original 4 ICPs.
  "dental": "clínica dental",
  "legal": "abogado",
  "hoteles-boutique": "hotel boutique",
  "turismo": "agencia de viajes",
  // Broad general-SMB verticals.
  "restaurante": "restaurante",
  "cafe": "café",
  "tienda-ropa": "tienda de ropa",
  "gimnasio": "gimnasio",
  "inmobiliaria": "inmobiliaria",
  "spa": "spa",
  "salon-belleza": "salón de belleza",
  "barberia": "barbería",
  "clinica-dental": "clínica dental",
  "clinica-estetica": "clínica estética",
  "consultorio-medico": "consultorio médico",
  "veterinaria": "veterinaria",
  "abogados": "abogado",
  "contador": "contador",
  "ferreteria": "ferretería",
  "panaderia": "panadería",
  "hotel-boutique": "hotel boutique",
  "agencia-viajes": "agencia de viajes",
  "agencia-marketing": "agencia de marketing",
  "constructora": "constructora",
  "autopartes": "repuestos para autos",
  "escuela-idiomas": "escuela de idiomas",
  "joyeria": "joyería",
  "floristeria": "floristería",
  "optica": "óptica",
  // Trades (the IG-or-nothing crowd · added 2026-05-26 for the lead sweep).
  "electricista": "electricista a domicilio",
  "plomero": "plomero a domicilio",
  "cerrajeria": "cerrajería",
  "vidrieria": "vidriería",
  "carpinteria": "carpintería",
  "pintor": "pintor de casas",
  "enchapador": "enchapes y pisos instalación",
  "jardineria": "jardinería a domicilio",
  "fumigacion": "fumigación de plagas",
  "aire-acondicionado": "servicio de aire acondicionado",
  "mudanzas": "empresa de mudanzas",
  "impermeabilizacion": "impermeabilización de techos",
  // Trades-support / supply.
  "pisos-enchapes-tienda": "tienda de pisos y enchapes",
  "materiales-construccion": "depósito de materiales de construcción",
  "tienda-pintura": "tienda de pintura",
  "iluminacion-tienda": "tienda de iluminación",
  "ceramica-tienda": "almacén de cerámica",
  "suministros-electricos": "suministros eléctricos",
  "herrajes-tienda": "herrajes y herramientas",
  "griferias-tienda": "almacén de griferías",
};

// City slug → display form (proper accents).
export const CITY_DISPLAY = {
  "medellin": "Medellín",
  "bogota": "Bogotá",
  "barranquilla": "Barranquilla",
  "cali": "Cali",
  "cartagena": "Cartagena",
};

// Default broad-SMB sweep (excludes the 4 legacy alias slugs).
export const BULK_DEFAULT_VERTICALS = [
  "restaurante", "cafe", "tienda-ropa", "gimnasio", "inmobiliaria",
  "spa", "salon-belleza", "barberia", "clinica-dental", "clinica-estetica",
  "consultorio-medico", "veterinaria", "abogados", "contador", "ferreteria",
  "panaderia", "hotel-boutique", "agencia-viajes", "agencia-marketing", "constructora",
  "autopartes", "escuela-idiomas", "joyeria", "floristeria", "optica",
];

export const BULK_DEFAULT_CITIES = ["medellin", "bogota", "barranquilla", "cali", "cartagena"];

// Curated trades preset · the 20 new trade + supply verticals plus the broad-set
// `ferreteria` and `constructora`. Pass this as `verticals` in a bulk-start body
// (or a deep-start body) to run a trades-only sweep.
export const TRADES_VERTICALS = [
  "electricista", "plomero", "cerrajeria", "vidrieria", "carpinteria",
  "pintor", "enchapador", "jardineria", "fumigacion", "aire-acondicionado",
  "mudanzas", "impermeabilizacion",
  "ferreteria", "constructora",
  "pisos-enchapes-tienda", "materiales-construccion", "tienda-pintura",
  "iluminacion-tienda", "ceramica-tienda", "suministros-electricos",
  "herrajes-tienda", "griferias-tienda",
];
