export interface PlatformPalette {
  id: string;
  name: string;
  description?: string | undefined;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  isSystem?: boolean | undefined;
  createdAt?: string | undefined;
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

export const FALLBACK_SYSTEM_PALETTES: PlatformPalette[] = [
  {
    id: "system-cyber-neon",
    name: "Cyber Neon",
    description: "Paleta futurista de alto contraste con acentos neón y violeta.",
    primaryColor: "#06b6d4",
    secondaryColor: "#8b5cf6",
    accentColor: "#ec4899",
    backgroundColor: "#090d16",
    textColor: "#f8fafc",
    isSystem: true,
  },
  {
    id: "system-tech-indigo",
    name: "Tech Indigo",
    description: "Azul cobalto e índigo para soluciones SaaS y corporativas.",
    primaryColor: "#4f46e5",
    secondaryColor: "#06b6d4",
    accentColor: "#f59e0b",
    backgroundColor: "#0b0f19",
    textColor: "#f9fafb",
    isSystem: true,
  },
  {
    id: "system-emerald-trust",
    name: "Emerald Trust",
    description: "Tonos esmeralda y menta orientados a finanzas, salud y confianza.",
    primaryColor: "#059669",
    secondaryColor: "#10b981",
    accentColor: "#34d399",
    backgroundColor: "#04130d",
    textColor: "#f0fdf4",
    isSystem: true,
  },
  {
    id: "system-amber-industrial",
    name: "Amber Industrial",
    description: "Ámbar técnico y amarillo industrial para servicios y logística.",
    primaryColor: "#d97706",
    secondaryColor: "#f59e0b",
    accentColor: "#fbbf24",
    backgroundColor: "#120e07",
    textColor: "#fffbeb",
    isSystem: true,
  },
  {
    id: "system-crimson-editorial",
    name: "Crimson Editorial",
    description: "Rojo carmesí de alta gama para agencias boutique y consultoría.",
    primaryColor: "#e11d48",
    secondaryColor: "#be123c",
    accentColor: "#fb7185",
    backgroundColor: "#140508",
    textColor: "#fff1f2",
    isSystem: true,
  },
  {
    id: "system-nordic-slate",
    name: "Nordic Slate",
    description: "Pizarra sobria y minimalismo nórdico de máxima legibilidad.",
    primaryColor: "#475569",
    secondaryColor: "#64748b",
    accentColor: "#38bdf8",
    backgroundColor: "#0b1120",
    textColor: "#f8fafc",
    isSystem: true,
  },
];
