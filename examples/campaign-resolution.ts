export function pickActiveCampaign(campaigns:any[], now:Date){
  return campaigns
    .filter(c => ['scheduled','active'].includes(c.status))
    .filter(c => new Date(c.starts_at) <= now && now < new Date(c.ends_at))
    .sort((a,b) => b.priority-a.priority || +new Date(b.starts_at)-+new Date(a.starts_at))[0] ?? null;
}
