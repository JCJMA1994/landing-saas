# ADR 0002: Tenant ownership and publication boundary

Status: Accepted.

Membership rows are the authorization source. Hostnames and client-provided
tenant/site IDs are routing inputs, never authorization. Phase zero grants
authenticated members read access only to their own membership and associated
tenants/sites; anonymous access and every runtime write are denied.

The platform accepts only `APP_HOSTNAME`; unknown hosts fail with 421. Verified
domains are deferred. Future public rendering must read an immutable active
publication snapshot, never mutable draft rows. No publication means no public
tenant content. Phase one must add audited role-specific mutations and negative
RLS tests together; phase three owns preview/publish/rollback.
