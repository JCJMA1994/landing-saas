import type { TemplateKey } from "../../domain/template/manifest";
import { isTemplateKey } from "../../domain/template/manifest";
import type { PlanId } from "../../domain/saas/plan";
import { isPlanId } from "../../domain/saas/plan";
import type { TenantRole } from "../../domain/tenant/roles";

export interface OnboardClientInput {
  tenantName: string;
  clientEmail: string;
  clientPassword: string;
  siteName: string;
  siteSlug: string;
  templateKey: TemplateKey;
  planId: PlanId;
  superadminUserId: string;
}

export interface OnboardClientResult {
  tenantId: string;
  tenantName: string;
  siteId: string;
  siteName: string;
  siteSlug: string;
  clientUserId: string;
  clientEmail: string;
  templateKey: TemplateKey;
  planId: PlanId;
}

export interface ClientOnboardingGateway {
  isSlugTaken(slug: string): Promise<boolean>;
  findOrCreateUser(email: string, password: string): Promise<{ id: string; email: string }>;
  createTenant(name: string): Promise<{ id: string; name: string }>;
  addTenantMember(tenantId: string, userId: string, role: TenantRole): Promise<void>;
  createSite(tenantId: string, name: string, slug: string, templateKey: TemplateKey): Promise<{ id: string; name: string; slug: string }>;
  createSubscription(tenantId: string, planId: PlanId): Promise<void>;
  initializeSiteContent(siteId: string, siteName: string, templateKey: TemplateKey): Promise<void>;
}

export class OnboardingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingValidationError";
  }
}

export class SlugAlreadyTakenError extends Error {
  constructor(slug: string) {
    super(`The site identifier "${slug}" is already taken. Please choose another one.`);
    this.name = "SlugAlreadyTakenError";
  }
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function onboardClientUseCase(
  input: OnboardClientInput,
  gateway: ClientOnboardingGateway,
  isSuperadmin: boolean,
): Promise<OnboardClientResult> {
  if (!isSuperadmin) {
    throw new OnboardingValidationError("Forbidden: Only platform superadmins can onboard clients.");
  }

  const tenantName = input.tenantName.trim();
  if (tenantName.length < 2 || tenantName.length > 120) {
    throw new OnboardingValidationError("Tenant name must be between 2 and 120 characters.");
  }

  const clientEmail = input.clientEmail.trim().toLowerCase();
  if (!EMAIL_REGEX.test(clientEmail) || clientEmail.length > 254) {
    throw new OnboardingValidationError("A valid client email address is required.");
  }

  const clientPassword = input.clientPassword;
  if (!clientPassword || clientPassword.length < 8) {
    throw new OnboardingValidationError("Initial password must be at least 8 characters long.");
  }

  const siteName = input.siteName.trim();
  if (siteName.length < 2 || siteName.length > 120) {
    throw new OnboardingValidationError("Site name must be between 2 and 120 characters.");
  }

  const siteSlug = input.siteSlug.trim().toLowerCase();
  if (!SLUG_REGEX.test(siteSlug) || siteSlug.length > 63) {
    throw new OnboardingValidationError("Site identifier (slug) must contain only lowercase letters, numbers, and hyphens (max 63 chars).");
  }

  if (!isTemplateKey(input.templateKey)) {
    throw new OnboardingValidationError(`Invalid template key: "${input.templateKey}".`);
  }

  if (!isPlanId(input.planId)) {
    throw new OnboardingValidationError(`Invalid plan requested: "${input.planId}".`);
  }

  // Verify slug uniqueness
  const taken = await gateway.isSlugTaken(siteSlug);
  if (taken) {
    throw new SlugAlreadyTakenError(siteSlug);
  }

  // 1. Create or resolve user in auth
  const user = await gateway.findOrCreateUser(clientEmail, clientPassword);

  // 2. Create tenant
  const tenant = await gateway.createTenant(tenantName);

  // 3. Add client as owner of tenant
  await gateway.addTenantMember(tenant.id, user.id, "owner");

  // 4. Add superadmin as admin of tenant so they can also manage/configure the site
  if (input.superadminUserId && input.superadminUserId !== user.id) {
    await gateway.addTenantMember(tenant.id, input.superadminUserId, "admin");
  }

  // 5. Create initial site
  const site = await gateway.createSite(tenant.id, siteName, siteSlug, input.templateKey);

  // 6. Create SaaS subscription
  await gateway.createSubscription(tenant.id, input.planId);

  // 7. Initialize baseline theme and hero content
  await gateway.initializeSiteContent(site.id, siteName, input.templateKey);

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    siteId: site.id,
    siteName: site.name,
    siteSlug: site.slug,
    clientUserId: user.id,
    clientEmail: user.email,
    templateKey: input.templateKey,
    planId: input.planId,
  };
}
