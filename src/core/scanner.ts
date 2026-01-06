import { exec } from './exec';
import type { NetworkDevice, NetworkInfo } from '../types';

/**
 * Get active network interface (WiFi)
 */
export async function getActiveInterface(): Promise<string> {
  try {
    // Try to find active wireless interface
    const { stdout } = await exec("ip link show | grep 'state UP' | grep -E 'wlan|wlp' | awk '{print $2}' | tr -d ':'");
    
    if (stdout.trim()) {
      return stdout.trim().split('\n')[0] || 'wlan0';
    }

    // Fallback: check for any UP interface
    const { stdout: fallback } = await exec("ip link show | grep 'state UP' | awk '{print $2}' | tr -d ':' | head -n1");
    const iface = fallback.trim();
    
    if (!iface) {
      throw new Error('No active network interface found');
    }

    return iface;
  } catch (error) {
    throw new Error('Failed to detect network interface. Are you connected to WiFi?');
  }
}

/**
 * Get network information from interface
 */
export async function getNetworkInfo(iface: string): Promise<NetworkInfo> {
  try {
    // Get IP and subnet
    const { stdout: ipInfo } = await exec(`ip addr show ${iface} | grep 'inet ' | awk '{print $2}'`);
    const [ip = '', subnet = ''] = ipInfo.trim().split('/');

    if (!ip) {
      throw new Error(`No IP address found on ${iface}`);
    }

    // Get gateway
    const { stdout: gwInfo } = await exec(`ip route | grep default | grep ${iface} | awk '{print $3}'`);
    const gateway = gwInfo.trim();

    // Get MAC address
    const { stdout: macInfo } = await exec(`ip link show ${iface} | grep link/ether | awk '{print $2}'`);
    const mac = macInfo.trim();

    // Calculate network address
    const networkAddr = calculateNetworkAddress(ip, subnet);

    return {
      interface: iface,
      ip,
      subnet,
      gateway,
      mac,
      networkAddress: networkAddr,
    };
  } catch (error) {
    throw new Error(`Failed to get network info for ${iface}: ${error}`);
  }
}

/**
 * Scan network for active devices
 */
export async function scanNetwork(networkInfo: NetworkInfo): Promise<NetworkDevice[]> {
  const { networkAddress, subnet, interface: iface, gateway, ip: ownIp } = networkInfo;
  const devices: NetworkDevice[] = [];

  try {
    // Try arp-scan first (faster)
    const { stdout, success } = await exec(
      `arp-scan --interface=${iface} --localnet --retry=1 --timeout=500 2>/dev/null`,
      { ignoreError: true }
    );

    if (success && stdout) {
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        // Parse arp-scan output: IP MAC Vendor
        const match = line.match(/^(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f:]{17})\s+(.*)$/i);
        
        if (match) {
          const [, ip = '', mac = '', vendor = ''] = match;
          
          devices.push({
            ip,
            mac,
            vendor: vendor.trim() || 'Unknown',
            isGateway: ip === gateway,
            isOwn: ip === ownIp,
          });
        }
      }
    }

    // Fallback to nmap if arp-scan not available
    if (devices.length === 0) {
      const { stdout: nmapOut } = await exec(
        `nmap -sn ${networkAddress}/${subnet} -T5 --max-retries 1 --host-timeout 500ms 2>/dev/null | grep 'Nmap scan report'`
      );

      const ipMatches = nmapOut.matchAll(/Nmap scan report for .*?(\d+\.\d+\.\d+\.\d+)/g);
      
      for (const match of ipMatches) {
        const ip = match[1];
        if (!ip) continue;

        // Get MAC from ARP table
        const { stdout: arpOut } = await exec(`arp -n ${ip} | grep ${ip} | awk '{print $3}'`);
        const mac = arpOut.trim() || 'Unknown';

        devices.push({
          ip,
          mac,
          vendor: 'Unknown',
          isGateway: ip === gateway,
          isOwn: ip === ownIp,
        });
      }
    }

    // Always add gateway if not found
    if (gateway && !devices.some(d => d.ip === gateway)) {
      const { stdout: gwMac } = await exec(`arp -n ${gateway} | grep ${gateway} | awk '{print $3}'`);
      
      devices.unshift({
        ip: gateway,
        mac: gwMac.trim() || 'Unknown',
        vendor: 'Gateway',
        isGateway: true,
        isOwn: false,
      });
    }

    return devices.sort((a, b) => {
      if (a.isGateway) return -1;
      if (b.isGateway) return 1;
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      return a.ip.localeCompare(b.ip);
    });

  } catch (error) {
    throw new Error(`Network scan failed: ${error}`);
  }
}

/**
 * Calculate network address from IP and subnet
 */
function calculateNetworkAddress(ip: string, subnet: string): string {
  const ipParts = ip.split('.').map(Number);
  const subnetMask = parseInt(subnet);

  // Simple calculation for common subnets
  if (subnetMask === 24) {
    return `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
  } else if (subnetMask === 16) {
    return `${ipParts[0]}.${ipParts[1]}.0.0`;
  } else if (subnetMask === 8) {
    return `${ipParts[0]}.0.0.0`;
  }

  // Default to /24
  return `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`;
}

/**
 * Quick validation if target is online
 */
export async function isTargetOnline(ip: string): Promise<boolean> {
  try {
    const { success } = await exec(`ping -c 1 -W 1 ${ip} 2>/dev/null`, { ignoreError: true });
    return success;
  } catch {
    return false;
  }
}