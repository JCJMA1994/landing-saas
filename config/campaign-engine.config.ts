export const campaignEngineConfig = {
  primaryCampaignOnly: true,
  timezoneStorage: 'UTC',
  allowedIntensity: ['subtle','balanced','festive'] as const,
  allowedSlots: ['theme','hero','announcement','promotion','decorations'] as const,
  maxDecorations: 6,
  respectReducedMotion: true,
  fallbackToBaseTheme: true,
};
