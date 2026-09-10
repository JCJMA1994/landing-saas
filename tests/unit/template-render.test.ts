import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  TEMPLATE_KEYS,
  getTemplateManifest,
} from "../../src/domain/template/manifest";

describe("Phase 2 Visual Direction Templates", () => {
  it("each template has its own distinct component implementation and design identity", async () => {
    const templateFiles: Record<string, string> = {
      "tech-diagnostic": "TechDiagnosticTemplate.astro",
      "repair-workshop": "RepairWorkshopTemplate.astro",
      "system-monitor": "SystemMonitorTemplate.astro",
      "tech-editorial": "TechEditorialTemplate.astro",
      "cyber-performance": "CyberPerformanceTemplate.astro",
      "friendly-tech": "FriendlyTechTemplate.astro",
    };

    for (const [key, filename] of Object.entries(templateFiles)) {
      const filePath = new URL(`../../src/components/templates/${filename}`, import.meta.url);
      const content = await readFile(filePath, "utf8");

      expect(content).toContain("data-theme-root");
      expect(content).toContain("themeToCssVariables");

      // Verify specific distinct design identity elements in each template
      if (key === "tech-diagnostic") {
        expect(content).toContain("template-diagnostic");
        expect(content).toContain("ESTADO DEL SISTEMA // NOMINAL");
        expect(content).toContain("diag-hud-overlay");
      } else if (key === "repair-workshop") {
        expect(content).toContain("template-workshop");
        expect(content).toContain("BANCO DE SERVICIO TÉCNICO");
        expect(content).toContain("work-card-stamp");
      } else if (key === "system-monitor") {
        expect(content).toContain("template-monitor");
        expect(content).toContain("DISPONIBILIDAD: 99.98%");
        expect(content).toContain("mon-terminal-window");
      } else if (key === "tech-editorial") {
        expect(content).toContain("template-editorial");
        expect(content).toContain("edit-masthead");
        expect(content).toContain("edit-pullquote");
      } else if (key === "cyber-performance") {
        expect(content).toContain("template-cyber");
        expect(content).toContain("TURBO BOOST");
        expect(content).toContain("cyber-media-bevel");
      } else if (key === "friendly-tech") {
        expect(content).toContain("template-friendly");
        expect(content).toContain("friendly-card-bubble");
        expect(content).toContain("👋 TE DAMOS LA BIENVENIDA");
      }
    }
  });

  it("admin template selector page implements zero-JS form switching and live preview", async () => {
    const templatePage = await readFile(
      new URL("../../src/pages/admin/sites/[id]/template.astro", import.meta.url),
      "utf8",
    );

    expect(templatePage).toContain("actions.saveSiteTemplate");
    expect(templatePage).toContain("TemplateRenderer");
    expect(templatePage).toContain("Direcciones Visuales Disponibles");
    expect(templatePage).toContain("BORRADOR");
    expect(templatePage).not.toContain("client:");
  });

  it("validates that all manifests have defined default variants", () => {
    for (const key of TEMPLATE_KEYS) {
      const manifest = getTemplateManifest(key);
      expect(manifest.defaultVariants.buttonVariant).toBeDefined();
      expect(manifest.defaultVariants.cardVariant).toBeDefined();
      expect(manifest.defaultVariants.fontKey).toBeDefined();
      expect(manifest.defaultVariants.radiusKey).toBeDefined();
    }
  });
});
