import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_SLOTS,
  getTemplateManifest,
  isTemplateKey,
  TEMPLATE_KEYS,
} from "../../src/domain/template/manifest";

describe("Template Manifests & Registry", () => {
  it("recognizes all 6 authentic template keys", () => {
    expect(TEMPLATE_KEYS).toHaveLength(6);
    expect(isTemplateKey("tech-diagnostic")).toBe(true);
    expect(isTemplateKey("repair-workshop")).toBe(true);
    expect(isTemplateKey("system-monitor")).toBe(true);
    expect(isTemplateKey("tech-editorial")).toBe(true);
    expect(isTemplateKey("cyber-performance")).toBe(true);
    expect(isTemplateKey("friendly-tech")).toBe(true);
    expect(isTemplateKey("generic-landing")).toBe(false);
  });

  it("each manifest declares unique composition, visual metaphor, and distinct personality", () => {
    const metaphors = new Set<string>();
    const personalities = new Set<string>();

    for (const key of TEMPLATE_KEYS) {
      const manifest = getTemplateManifest(key);
      expect(manifest.version).toBeGreaterThanOrEqual(1);
      expect(manifest.description.length).toBeGreaterThan(15);
      expect(manifest.visualMetaphor.length).toBeGreaterThan(15);
      expect(manifest.compositionRhythm.length).toBeGreaterThan(15);

      // Verify uniqueness of design identity across templates
      expect(metaphors.has(manifest.visualMetaphor)).toBe(false);
      expect(personalities.has(manifest.personality)).toBe(false);

      metaphors.add(manifest.visualMetaphor);
      personalities.add(manifest.personality);

      // Verify campaign slots are valid
      for (const slot of manifest.supportedCampaignSlots) {
        expect(CAMPAIGN_SLOTS).toContain(slot);
      }
    }
  });

  it("throws error for non-existent template key lookup", () => {
    // @ts-expect-error testing invalid key lookup
    expect(() => getTemplateManifest("non-existent")).toThrow("Unknown template key");
  });
});
