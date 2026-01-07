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