interface PolicyRef { policy?: { admin_access?: boolean } | null; admin_access?: boolean }

export interface Identity {
  id: string;
  role?: { policies?: PolicyRef[] | null } | null;
  policies?: PolicyRef[] | null;
}

/** Directus 11 concede acceso administrador mediante políticas, no por nombre o correo. */
export function hasAdminPolicy(identity: Identity): boolean {
  return [...(identity.policies ?? []), ...(identity.role?.policies ?? [])]
    .some((entry) => entry.policy?.admin_access === true || entry.admin_access === true);
}
