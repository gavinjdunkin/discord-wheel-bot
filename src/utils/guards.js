export function isAdmin(interaction) {
  const roleId = process.env.ADMIN_ROLE_ID;
  if (!roleId) return interaction.member.permissions.has('ManageGuild');
  return interaction.member.roles.cache.has(roleId);
}
