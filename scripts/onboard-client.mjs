import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://ceyqdipflumrvjemelvr.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNleXFkaXBmbHVtcnZqZW1lbHZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA1NzM2MywiZXhwIjoyMTA0NjMzMzYzfQ.-pILATUrZN-w5CrrBKOZdBwlTRnEL2ilQsKWMU9zAaM";

const [
  ,, 
  email = "chimbote.tech@gmail.com", 
  password = "m0r3n01994@A", 
  tenantName = "Innovaciones Moreno",
  siteSlug = "innovaciones-moreno",
  templateKey = "tech-diagnostic",
  planId = "pro"
] = process.argv;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`\n🚀 Iniciando onboarding de cliente...`);
  console.log(`👤 Email: ${email}`);
  console.log(`🏢 Empresa / Tenant: ${tenantName}`);
  console.log(`🌐 Slug del sitio: ${siteSlug}`);
  console.log(`🎨 Template: ${templateKey}`);
  console.log(`📦 Plan: ${planId}`);

  // 1. Obtener superadmin de la plataforma
  const { data: superAdmins } = await supabase.from("platform_superadmins").select("user_id").limit(1);
  const superadminId = superAdmins?.[0]?.user_id;
  console.log(`🛡️ Superadmin identificado: ${superadminId || "Ninguno"}`);

  // 2. Crear o resolver usuario en Supabase Auth
  let userId;
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: tenantName },
  });

  if (userError) {
    if (userError.message.includes("already registered") || userError.message.includes("already been registered")) {
      console.log(`ℹ️ El usuario ${email} ya existía en Auth. Obteniendo ID y actualizando contraseña...`);
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) throw new Error("No se pudo localizar el usuario existente en Auth.");
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    } else {
      throw userError;
    }
  } else {
    userId = userData.user.id;
    console.log(`✓ Usuario creado en Auth con ID: ${userId}`);
  }

  // 3. Crear Tenant
  console.log(`🏢 Creando tenant "${tenantName}"...`);
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: tenantName })
    .select("id, name")
    .single();

  let tenantId;
  if (tenantError) {
    console.warn(`⚠️ Aviso al insertar tenant: ${tenantError.message}`);
    const { data: existingTenant } = await supabase.from("tenants").select("id").eq("name", tenantName).limit(1).single();
    if (!existingTenant) throw tenantError;
    tenantId = existingTenant.id;
  } else {
    tenantId = tenant.id;
  }
  console.log(`✓ Tenant listo con ID: ${tenantId}`);

  // 4. Asignar membresía: Cliente como 'owner'
  console.log(`🔑 Asignando membresía 'owner' al cliente...`);
  const { error: memberError } = await supabase
    .from("tenant_members")
    .upsert({
      tenant_id: tenantId,
      user_id: userId,
      role: "owner",
    }, { onConflict: "tenant_id,user_id" });

  if (memberError) throw memberError;
  console.log(`✓ Cliente asignado como Owner del tenant.`);

  // 5. Asignar al superadmin como 'admin' del tenant (para soporte y backoffice)
  if (superadminId && superadminId !== userId) {
    console.log(`🛡️ Vinculando superadmin al tenant para administración y soporte...`);
    await supabase.from("tenant_members").upsert({
      tenant_id: tenantId,
      user_id: superadminId,
      role: "admin",
    }, { onConflict: "tenant_id,user_id" });
  }

  // 6. Verificar y crear sitio
  console.log(`🌐 Verificando y creando sitio con slug "${siteSlug}"...`);
  const { data: existingSite } = await supabase.from("sites").select("id, slug").eq("slug", siteSlug).maybeSingle();
  let siteId;
  if (existingSite) {
    siteId = existingSite.id;
    console.log(`ℹ️ El sitio con slug "${siteSlug}" ya existe con ID: ${siteId}`);
  } else {
    const { data: newSite, error: siteError } = await supabase
      .from("sites")
      .insert({
        tenant_id: tenantId,
        name: tenantName,
        slug: siteSlug,
        template_key: templateKey,
      })
      .select("id, name, slug")
      .single();

    if (siteError) throw siteError;
    siteId = newSite.id;
    console.log(`✓ Sitio creado con ID: ${siteId} y slug: "${newSite.slug}"`);
  }

  // 7. Configurar Suscripción
  console.log(`💳 Asignando plan de suscripción "${planId}"...`);
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { error: subError } = await supabase.from("tenant_subscriptions").upsert({
    tenant_id: tenantId,
    plan_id: planId,
    status: "active",
    current_period_starts_at: now.toISOString(),
    current_period_ends_at: periodEnd.toISOString(),
    cancel_at_period_end: false,
    updated_at: now.toISOString(),
  }, { onConflict: "tenant_id" });

  if (subError) console.warn(`⚠️ Error en suscripción: ${subError.message}`);
  else console.log(`✓ Suscripción "${planId}" activa por 30 días.`);

  // 8. Inicializar contenido del sitio (Tema + Hero)
  console.log(`🎨 Inicializando contenido base (site_theme y site_hero)...`);
  await supabase.from("site_theme").upsert({
    site_id: siteId,
    primary_color: "#3b82f6",
    secondary_color: "#64748b",
    accent_color: "#f59e0b",
    background_color: "#0a0f1e",
    text_color: "#f8fafc",
    font_key: "inter",
    radius_key: "subtle",
    button_variant: "solid",
    card_variant: "bordered",
  }, { onConflict: "site_id" });

  await supabase.from("site_hero").upsert({
    site_id: siteId,
    headline: `Bienvenido a ${tenantName}`,
    subheadline: `Soluciones tecnológicas y desarrollo de alta precisión para potenciar tu empresa.`,
    cta_text: "Ver Soluciones",
    cta_link: "#contacto",
    badge_text: "Innovación Activa",
  }, { onConflict: "site_id" });
  console.log(`✓ Contenido inicial y tema configurados.`);

  console.log(`\n======================================================`);
  console.log(`🎉 ¡CLIENTE CREADO EXITOSAMENTE!`);
  console.log(`======================================================`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Contraseña: ${password}`);
  console.log(`🏢 Empresa / Tenant: ${tenantName} (ID: ${tenantId})`);
  console.log(`🌐 Landing Pública: /sites/${siteSlug}`);
  console.log(`🛠️ Panel del Cliente: /admin/login`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("\n❌ Error en el onboarding:", err);
  process.exit(1);
});
