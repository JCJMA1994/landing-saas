import type {
  ThemeButtonVariant,
  ThemeCardVariant,
  ThemeFont,
  ThemeRadius,
} from "../site/theme";

export const TEMPLATE_KEYS = [
  "tech-diagnostic",
  "repair-workshop",
  "system-monitor",
  "tech-editorial",
  "cyber-performance",
  "friendly-tech",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const TEMPLATE_SECTIONS = [
  "hero",
  "cards",
  "promotions",
  "contacts",
] as const;

export type TemplateSection = (typeof TEMPLATE_SECTIONS)[number];

export const CAMPAIGN_SLOTS = [
  "theme",
  "hero",
  "announcement",
  "promotion",
  "decorations",
] as const;

export type CampaignSlot = (typeof CAMPAIGN_SLOTS)[number];

export interface TemplateManifest {
  key: TemplateKey;
  name: string;
  version: number;
  description: string;
  personality: string;
  visualMetaphor: string;
  compositionRhythm: string;
  supportedSections: readonly TemplateSection[];
  supportedCampaignSlots: readonly CampaignSlot[];
  defaultVariants: {
    fontKey: ThemeFont;
    radiusKey: ThemeRadius;
    buttonVariant: ThemeButtonVariant;
    cardVariant: ThemeCardVariant;
  };
}

export function isTemplateKey(value: string): value is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export const TEMPLATE_MANIFESTS: Record<TemplateKey, TemplateManifest> = {
  "tech-diagnostic": {
    key: "tech-diagnostic",
    name: "Tech Diagnostic",
    version: 1,
    description: "Inspirado en instrumentos de telemetría y diagnóstico técnico de precisión.",
    personality: "Analítico, preciso, estructurado y de alta confianza técnica.",
    visualMetaphor: "Panel HUD de instrumentos de diagnóstico con chips de estado y rejilla métrica.",
    compositionRhythm: "Cabecera con telemetría de servicio, rejilla densa de métricas y bloques de componentes técnicos.",
    supportedSections: ["hero", "cards", "promotions", "contacts"],
    supportedCampaignSlots: ["theme", "hero", "announcement", "promotion", "decorations"],
    defaultVariants: {
      fontKey: "space-grotesk",
      radiusKey: "sharp",
      buttonVariant: "solid",
      cardVariant: "bordered",
    },
  },
  "repair-workshop": {
    key: "repair-workshop",
    name: "Repair Workshop",
    version: 1,
    description: "Lenguaje de banco de reparación industrial con etiquetas, números de pieza y fichas modulares.",
    personality: "Artesanal, metódico, transparente y enfocado en el oficio del servicio técnico.",
    visualMetaphor: "Mesa de trabajo de ingeniería con órdenes de servicio, sellos y piezas numeradas.",
    compositionRhythm: "Ficha de servicio con ticket identificador, catálogo de soluciones modulares y sellos de garantía.",
    supportedSections: ["hero", "cards", "promotions", "contacts"],
    supportedCampaignSlots: ["theme", "hero", "announcement", "promotion", "decorations"],
    defaultVariants: {
      fontKey: "roboto",
      radiusKey: "subtle",
      buttonVariant: "outline",
      cardVariant: "bordered",
    },
  },
  "system-monitor": {
    key: "system-monitor",
    name: "System Monitor",
    version: 1,
    description: "Dashboard de observabilidad y disponibilidad continua de sistemas.",
    personality: "Vigilante, transparente, tiempo real y alta fiabilidad de operación.",
    visualMetaphor: "Línea de comando y monitor de latencia/uptime convertido en propuesta comercial.",
    compositionRhythm: "Status pings activos, carriles de diagnóstico horizontal y microdetalles tipo terminal.",
    supportedSections: ["hero", "cards", "promotions", "contacts"],
    supportedCampaignSlots: ["theme", "hero", "announcement", "promotion"],
    defaultVariants: {
      fontKey: "space-grotesk",
      radiusKey: "subtle",
      buttonVariant: "solid",
      cardVariant: "glass",
    },
  },
  "tech-editorial": {
    key: "tech-editorial",
    name: "Tech Editorial",
    version: 1,
    description: "Composición asimétrica de gran escala con tipografía dominante y citas destacadas.",
    personality: "Sofisticado, conceptual, reflexivo y de alta gama editorial.",
    visualMetaphor: "Revista especializada de tecnología con titulares imponentes y espacios negativos.",
    compositionRhythm: "Titular desfasado, pull quotes, columnas de lectura asimétricas y bloques de descanso visual.",
    supportedSections: ["hero", "cards", "promotions", "contacts"],
    supportedCampaignSlots: ["theme", "hero", "announcement", "promotion"],
    defaultVariants: {
      fontKey: "inter",
      radiusKey: "sharp",
      buttonVariant: "ghost",
      cardVariant: "flat",
    },
  },
  "cyber-performance": {
    key: "cyber-performance",
    name: "Cyber Performance",
    version: 1,
    description: "Diseño de alto rendimiento, workstations y overclocking con bordes angulares y líneas dinámicas.",
    personality: "Potente, agresivo, hiperveloz y orientado a rendimiento extremo.",
    visualMetaphor: "Placa base de alto rendimiento con trazas de energía y badges de velocidad.",
    compositionRhythm: "Cortes biselados en 45°, badges de frecuencia turbo, contraste elevado y acentos luminosos.",
    supportedSections: ["hero", "cards", "promotions", "contacts"],
    supportedCampaignSlots: ["theme", "hero", "announcement", "promotion", "decorations"],
    defaultVariants: {
      fontKey: "space-grotesk",
      radiusKey: "sharp",
      buttonVariant: "gradient",
      cardVariant: "glass",
    },
  },
  "friendly-tech": {
    key: "friendly-tech",
    name: "Friendly Tech",
    version: 1,
    description: "Diseño humano y cercano para hogares y pymes con curvas suaves y micro-copy accesible.",
    personality: "Cálido, empático, sin jerga técnica y centrado en la tranquilidad del cliente.",
    visualMetaphor: "Asistente personal amigable, tarjetas envolventes y pasos visuales claros.",
    compositionRhythm: "Curvas generosas, bloques de alivio emocional, llamadas a la acción amables y contraste suave.",
    supportedSections: ["hero", "cards", "promotions", "contacts"],
    supportedCampaignSlots: ["theme", "hero", "announcement", "promotion", "decorations"],
    defaultVariants: {
      fontKey: "outfit",
      radiusKey: "rounded",
      buttonVariant: "solid",
      cardVariant: "elevated",
    },
  },
};

export function getTemplateManifest(key: TemplateKey): TemplateManifest {
  const manifest = TEMPLATE_MANIFESTS[key];
  if (!manifest) {
    throw new Error(`Unknown template key: ${key}`);
  }
  return manifest;
}
