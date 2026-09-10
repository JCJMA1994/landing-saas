export type CampaignIntensity = 'subtle' | 'balanced' | 'festive';
export interface SiteTheme { primary:string; secondary:string; accent:string; background:string; text:string; font:string; radius:string; buttonVariant:string; cardVariant:string; }
export interface CampaignOverrides {
  theme?: Partial<Pick<SiteTheme,'accent'|'background'|'text'>>;
  hero?: { badge?:string; title?:string; subtitle?:string; mediaAssetId?:string; layoutVariant?:string };
  announcement?: { enabled:boolean; text?:string; ctaLabel?:string; ctaHref?:string };
  promotion?: { enabled:boolean; title?:string; description?:string; mediaAssetId?:string };
  decorations?: { presetKey?:string; motionPreset?:'none'|'subtle'|'festive' };
}
