import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://ceyqdipflumrvjemelvr.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNleXFkaXBmbHVtcnZqZW1lbHZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA1NzM2MywiZXhwIjoyMTA0NjMzMzYzfQ.-pILATUrZN-w5CrrBKOZdBwlTRnEL2ilQsKWMU9zAaM";

const [,, email, password, tenantName = "System Failed Tech"] = process.argv;

if (!email || !password) {
  console.error("Uso: node scripts/create-admin.mjs <email> <password> [tenantName]");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`\n🚀 Creando usuario y workspace para: ${email}...`);

  // 1. Crear o buscar usuario en Supabase Auth
  let userId;
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Jose Carlos Joao Moreno Aleman" },
  });

  if (userError) {
    if (userError.message.includes("already registered") || userError.message.includes("already been registered")) {
      console.log(`ℹ️  El usuario ${email} ya existe en Supabase Auth. Buscando ID...`);
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = listData.users.find((u) => u.email === email);
      if (!existing) throw new Error("No se pudo localizar el usuario existente.");
      userId = existing.id;
    } else {
      throw userError;
    }
  } else {
    userId = userData.user.id;
    console.log(`✓ Usuario creado en Auth con ID: ${userId}`);
  }

  // 2. Crear Tenant
  console.log(`🏢 Creando tenant: "${tenantName}"...`);
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name: tenantName })
    .select("id, name")
    .single();

  let tenantId;
  if (tenantError) {
    console.warn(`Aviso en tenants: ${tenantError.message}`);
    const { data: existingTenant } = await supabase.from("tenants").select("id").limit(1).single();
    if (!existingTenant) throw tenantError;
    tenantId = existingTenant.id;
  } else {
    tenantId = tenant.id;
    console.log(`✓ Tenant creado con ID: ${tenantId}`);
  }

  // 3. Asignar rol de 'owner' en tenant_members
  console.log(`🔑 Asignando rol 'owner' en tenant_members...`);
  const { error: memberError } = await supabase
    .from("tenant_members")
    .upsert({
      tenant_id: tenantId,
      user_id: userId,
      role: "owner",
    });

  if (memberError) throw memberError;
  console.log(`✓ Asignado como Owner del workspace.`);

  // 4. Asignar como Platform Superadmin (Backoffice)
  console.log(`🛡️ Asignando permisos de platform_superadmin...`);
  const { error: superadminError } = await supabase
    .from("platform_superadmins")
    .upsert({ user_id: userId });

  if (superadminError) {
    console.warn(`Aviso en superadmins (opcional): ${superadminError.message}`);
  } else {
    console.log(`✓ Permisos de superadmin concedidos.`);
  }

  // 5. Crear sitio demo inicial para este tenant si no tiene
  const { data: existingSites } = await supabase
    .from("sites")
    .select("id, slug")
    .eq("tenant_id", tenantId);

  if (!existingSites || existingSites.length === 0) {
    console.log(`🌐 Creando primer sitio para el tenant...`);
    const { data: newSite, error: siteError } = await supabase
      .from("sites")
      .insert({
        tenant_id: tenantId,
        name: "Mi Primera Landing",
        slug: "mi-landing",
      })
      .select()
      .single();

    if (siteError) {
      console.warn(`Aviso al crear sitio: ${siteError.message}`);
    } else {
      console.log(`✓ Sitio inicial creado: slug "${newSite.slug}"`);
    }
  }

  console.log(`\n🎉 ¡Listo! Ya podés iniciar sesión en: https://system-failed-tech.com/admin/login`);
  console.log(`   Email: ${email}`);
}

main().catch((err) => {
  console.error("\n❌ Error en el aprovisionamiento:", err);
  process.exit(1);
});
