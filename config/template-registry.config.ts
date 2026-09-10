import { TEMPLATE_MANIFESTS } from "../src/domain/template/manifest";

export const templateRegistry = {
  "tech-diagnostic": {
    version: TEMPLATE_MANIFESTS["tech-diagnostic"].version,
    campaignSlots: TEMPLATE_MANIFESTS["tech-diagnostic"].supportedCampaignSlots,
  },
  "repair-workshop": {
    version: TEMPLATE_MANIFESTS["repair-workshop"].version,
    campaignSlots: TEMPLATE_MANIFESTS["repair-workshop"].supportedCampaignSlots,
  },
  "system-monitor": {
    version: TEMPLATE_MANIFESTS["system-monitor"].version,
    campaignSlots: TEMPLATE_MANIFESTS["system-monitor"].supportedCampaignSlots,
  },
  "tech-editorial": {
    version: TEMPLATE_MANIFESTS["tech-editorial"].version,
    campaignSlots: TEMPLATE_MANIFESTS["tech-editorial"].supportedCampaignSlots,
  },
  "cyber-performance": {
    version: TEMPLATE_MANIFESTS["cyber-performance"].version,
    campaignSlots: TEMPLATE_MANIFESTS["cyber-performance"].supportedCampaignSlots,
  },
  "friendly-tech": {
    version: TEMPLATE_MANIFESTS["friendly-tech"].version,
    campaignSlots: TEMPLATE_MANIFESTS["friendly-tech"].supportedCampaignSlots,
  },
} as const;
