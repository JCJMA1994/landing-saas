-- Migration: 20260923000000_seed_innovaciones_moreno.sql
-- Purpose: Populate complete, production-grade components (Hero, Theme, Contacts, Cards, Promotions) and published active snapshot for Innovaciones Moreno.

begin;

do $$
declare
  v_site_id uuid;
  v_site_name text;
  v_site_slug text;
  v_tenant_id uuid;
  v_user_id uuid;
  v_version integer;
  v_snapshot jsonb;
begin
  -- 1. Locate site by slug
  select id, name, slug, tenant_id into v_site_id, v_site_name, v_site_slug, v_tenant_id
  from public.sites
  where slug = 'innovaciones-moreno'
  limit 1;

  if v_site_id is null then
    select id, name, slug, tenant_id into v_site_id, v_site_name, v_site_slug, v_tenant_id
    from public.sites
    limit 1;
  end if;

  if v_site_id is not null then
    -- Find publishing user
    select user_id into v_user_id
    from public.tenant_members
    where tenant_id = v_tenant_id
    limit 1;

    if v_user_id is null then
      select id into v_user_id from auth.users limit 1;
    end if;

    -- Update or Insert Site Hero
    insert into public.site_hero (site_id, headline, subheadline, cta_text, cta_link, badge_text, updated_at)
    values (
      v_site_id,
      'Ingeniería de Precisión y Soluciones Tecnológicas Avanzadas',
      'Optimizamos el rendimiento de tu infraestructura y equipos con diagnóstico computarizado de última generación, mantenimiento especializado y garantía técnica certificada.',
      'Solicitar Diagnóstico',
      '#contacto',
      'TECNOLOGÍA & INNOVACIÓN',
      now()
    )
    on conflict (site_id) do update set
      headline = excluded.headline,
      subheadline = excluded.subheadline,
      cta_text = excluded.cta_text,
      cta_link = excluded.cta_link,
      badge_text = excluded.badge_text,
      updated_at = now();

    -- Update or Insert Site Theme
    insert into public.site_theme (
      site_id, primary_color, secondary_color, accent_color, background_color, text_color,
      font_key, radius_key, button_variant, card_variant, updated_at
    )
    values (
      v_site_id,
      '#3b82f6', '#1d4ed8', '#f59e0b', '#0a0f1e', '#f8fafc',
      'space-grotesk', 'subtle', 'solid', 'bordered', now()
    )
    on conflict (site_id) do update set
      primary_color = excluded.primary_color,
      secondary_color = excluded.secondary_color,
      accent_color = excluded.accent_color,
      background_color = excluded.background_color,
      text_color = excluded.text_color,
      font_key = excluded.font_key,
      radius_key = excluded.radius_key,
      button_variant = excluded.button_variant,
      card_variant = excluded.card_variant,
      updated_at = now();

    -- Update or Insert Site Contacts
    insert into public.site_contacts (
      site_id, whatsapp_number, whatsapp_message, instagram_handle, facebook_url, email, phone, updated_at
    )
    values (
      v_site_id,
      '+5491122334455',
      'Hola Innovaciones Moreno, quiero coordinar un diagnóstico técnico para mi equipo.',
      'innovacionesmoreno',
      'https://facebook.com/innovacionesmoreno',
      'contacto@innovaciones-moreno.com',
      '+54 11 2233-4455',
      now()
    )
    on conflict (site_id) do update set
      whatsapp_number = excluded.whatsapp_number,
      whatsapp_message = excluded.whatsapp_message,
      instagram_handle = excluded.instagram_handle,
      facebook_url = excluded.facebook_url,
      email = excluded.email,
      phone = excluded.phone,
      updated_at = now();

    -- Populate Site Cards
    delete from public.site_cards where site_id = v_site_id;

    insert into public.site_cards (site_id, title, description, icon_key, badge, link_url, sort_order)
    values
      (
        v_site_id,
        'Diagnóstico Electrónico de Precisión',
        'Escaneo integral y telemetría en tiempo real para detectar anomalías antes de que provoquen fallas críticas en los sistemas.',
        'cpu',
        'ALTA PRECISIÓN',
        '#contacto',
        1
      ),
      (
        v_site_id,
        'Mantenimiento y Reparación Especializada',
        'Intervención técnica a nivel de microcomponentes con instrumental de laboratorio calibrado y repuestos originales.',
        'wrench',
        'GARANTÍA 1 AÑO',
        '#contacto',
        2
      ),
      (
        v_site_id,
        'Optimización y Calibración de Firmware',
        'Actualización de sistemas y calibración de parámetros operativos para alcanzar máxima eficiencia energética y durabilidad.',
        'bolt',
        '+35% RENDIMIENTO',
        '#contacto',
        3
      ),
      (
        v_site_id,
        'Blindaje y Protección de Circuitos',
        'Supresión activa de transitorios, aislamiento galvánico y certificación de seguridad eléctrica bajo normas internacionales.',
        'shield',
        'NORMA ISO',
        '#contacto',
        4
      ),
      (
        v_site_id,
        'Telemetría y Monitoreo Remoto',
        'Integración de sensores IoT para supervisión continua del estado operativo con tableros en la nube y alertas automáticas.',
        'chart',
        'CLOUD IOT',
        '#contacto',
        5
      ),
      (
        v_site_id,
        'Despacho y Asistencia In Situ',
        'Unidades móviles equipadas para evaluación técnica en terreno y resolución express directamente en sus instalaciones.',
        'rocket',
        'RESPUESTA 24H',
        '#contacto',
        6
      );

    -- Populate active Promotions for the continuous looping carousel
    delete from public.site_promotions where site_id = v_site_id;

    insert into public.site_promotions (site_id, title, description, discount_label, coupon_code, is_active)
    values
      (
        v_site_id,
        'Diagnóstico Computarizado Inicial con 25% OFF',
        'Escaneo completo de módulos electrónicos con entrega de reporte de estado certificado.',
        '25% OFF',
        'INNOVA25',
        true
      ),
      (
        v_site_id,
        'Plan Mantenimiento Preventivo Semestral',
        'Agenda tu servicio integral antes de fin de mes y recibí calibración de sensores bonificada.',
        'CALIBRACIÓN GRATIS',
        'BONUSPREVENT',
        true
      ),
      (
        v_site_id,
        'Soporte Técnico Especializado para Empresas',
        'Contrato corporativo de telemetría y atención prioritaria con respuesta técnica garantizada.',
        'ATENCIÓN VIP',
        'CORPTECH',
        true
      );

    -- Calculate next publication version
    select coalesce(max(version), 0) + 1 into v_version
    from public.site_publications
    where site_id = v_site_id;

    -- Deactivate previous publications
    update public.site_publications
    set is_active = false
    where site_id = v_site_id and is_active = true;

    -- Construct the exact JSON structure for PublicationSnapshot
    v_snapshot := jsonb_build_object(
      'schemaVersion', 1,
      'siteId', v_site_id,
      'siteName', v_site_name,
      'siteSlug', v_site_slug,
      'templateKey', 'tech-diagnostic',
      'templateVersion', 1,
      'theme', jsonb_build_object(
        'siteId', v_site_id,
        'primaryColor', '#3b82f6',
        'secondaryColor', '#1d4ed8',
        'accentColor', '#f59e0b',
        'backgroundColor', '#0a0f1e',
        'textColor', '#f8fafc',
        'fontKey', 'space-grotesk',
        'radiusKey', 'subtle',
        'buttonVariant', 'solid',
        'cardVariant', 'bordered'
      ),
      'hero', jsonb_build_object(
        'siteId', v_site_id,
        'headline', 'Ingeniería de Precisión y Soluciones Tecnológicas Avanzadas',
        'subheadline', 'Optimizamos el rendimiento de tu infraestructura y equipos con diagnóstico computarizado de última generación, mantenimiento especializado y garantía técnica certificada.',
        'ctaText', 'Solicitar Diagnóstico',
        'ctaLink', '#contacto',
        'badgeText', 'TECNOLOGÍA & INNOVACIÓN'
      ),
      'cards', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Diagnóstico Electrónico de Precisión', 'description', 'Escaneo integral y telemetría en tiempo real para detectar anomalías antes de que provoquen fallas críticas en los sistemas.', 'iconKey', 'cpu', 'badge', 'ALTA PRECISIÓN', 'linkUrl', '#contacto', 'sortOrder', 1),
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Mantenimiento y Reparación Especializada', 'description', 'Intervención técnica a nivel de microcomponentes con instrumental de laboratorio calibrado y repuestos originales.', 'iconKey', 'wrench', 'badge', 'GARANTÍA 1 AÑO', 'linkUrl', '#contacto', 'sortOrder', 2),
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Optimización y Calibración de Firmware', 'description', 'Actualización de sistemas y calibración de parámetros operativos para alcanzar máxima eficiencia energética y durabilidad.', 'iconKey', 'bolt', 'badge', '+35% RENDIMIENTO', 'linkUrl', '#contacto', 'sortOrder', 3),
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Blindaje y Protección de Circuitos', 'description', 'Supresión activa de transitorios, aislamiento galvánico y certificación de seguridad eléctrica bajo normas internacionales.', 'iconKey', 'shield', 'badge', 'NORMA ISO', 'linkUrl', '#contacto', 'sortOrder', 4),
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Telemetría y Monitoreo Remoto', 'description', 'Integración de sensores IoT para supervisión continua del estado operativo con tableros en la nube y alertas automáticas.', 'iconKey', 'chart', 'badge', 'CLOUD IOT', 'linkUrl', '#contacto', 'sortOrder', 5),
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Despacho y Asistencia In Situ', 'description', 'Unidades móviles equipadas para evaluación técnica en terreno y resolución express directamente en sus instalaciones.', 'iconKey', 'rocket', 'badge', 'RESPUESTA 24H', 'linkUrl', '#contacto', 'sortOrder', 6)
      ),
      'promotions', jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Diagnóstico Computarizado Inicial con 25% OFF', 'description', 'Escaneo completo de módulos electrónicos con entrega de reporte de estado certificado.', 'discountLabel', '25% OFF', 'couponCode', 'INNOVA25', 'isActive', true),
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Plan Mantenimiento Preventivo Semestral', 'description', 'Agenda tu servicio integral antes de fin de mes y recibí calibración de sensores bonificada.', 'discountLabel', 'CALIBRACIÓN GRATIS', 'couponCode', 'BONUSPREVENT', 'isActive', true),
        jsonb_build_object('id', gen_random_uuid(), 'siteId', v_site_id, 'title', 'Soporte Técnico Especializado para Empresas', 'description', 'Contrato corporativo de telemetría y atención prioritaria con respuesta técnica garantizada.', 'discountLabel', 'ATENCIÓN VIP', 'couponCode', 'CORPTECH', 'isActive', true)
      ),
      'contacts', jsonb_build_object(
        'siteId', v_site_id,
        'whatsappNumber', '+5491122334455',
        'whatsappMessage', 'Hola Innovaciones Moreno, quiero coordinar un diagnóstico técnico para mi equipo.',
        'instagramHandle', 'innovacionesmoreno',
        'facebookUrl', 'https://facebook.com/innovacionesmoreno',
        'email', 'contacto@innovaciones-moreno.com',
        'phone', '+54 11 2233-4455'
      ),
      'publishedAt', now()
    );

    insert into public.site_publications (
      site_id, version, snapshot, checksum, published_by, published_at, is_active
    )
    values (
      v_site_id,
      v_version,
      v_snapshot,
      md5(v_snapshot::text),
      v_user_id,
      now(),
      true
    );

  end if;
end $$;

commit;
