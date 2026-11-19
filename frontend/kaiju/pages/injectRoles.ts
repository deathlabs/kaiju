export type InjectRole = 'information_system_owner' | 'information_system_security_manager' | 'information_system_security_officer' | 'system_administrator' | 'user' | 'cybersecurity_service_provider' | 'opposing_force'

export const injectRoleLabels: Record<InjectRole, string> = {
  information_system_owner: 'Information System Owner',
  information_system_security_manager: 'Information System Security Manager',
  information_system_security_officer: 'Information System Security Officer',
  system_administrator: 'System Administrator',
  user: 'User',
  cybersecurity_service_provider: 'Cybersecurity Service Provider',
  opposing_force: 'Red Team',
}
