/**
 * Network device information
 */
export interface NetworkDevice {
  ip: string;
  mac: string;
  vendor?: string;
  isGateway?: boolean;
  isOwn?: boolean;
}

/**
 * Network interface information
 */
export interface NetworkInfo {
  interface: string;
  ip: string;
  subnet: string;
  gateway: string;
  mac: string;
  networkAddress: string;
}

/**
 * Attack configuration
 */
export interface AttackConfig {
  targetIp: string;
  targetMac?: string;
  interface: string;
  gateway: string;
}

/**
 * Attack rules for cleanup
 */
export interface AttackRules {
  tc: string[];
  iptables: string[];
  netem: string[];
}

/**
 * Attack target information
 */
export interface AttackTarget {
  ip: string;
  mac: string;
  startTime: string;
  rules: AttackRules;
}

/**
 * Attack state
 */
export interface AttackState {
  active: boolean;
  targets: AttackTarget[];
  interface: string;
  gateway: string;
  startTime: string;
}

/**
 * CLI command type
 */
export type Command = 'scan' | 'kill' | 'stop' | 'status' | 'help';