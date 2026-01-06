import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import type { AttackState, AttackTarget } from '../types';

const STATE_FILE = '/tmp/netheripper.state.json';

/**
 * Load attack state from file
 */
export function loadState(): AttackState | null {
  try {
    if (!existsSync(STATE_FILE)) {
      return null;
    }

    const data = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(data) as AttackState;
  } catch {
    return null;
  }
}

/**
 * Save attack state to file
 */
export function saveState(state: AttackState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    throw new Error(`Failed to save state: ${error}`);
  }
}

/**
 * Delete state file
 */
export function deleteState(): void {
  try {
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Add target to attack state
 */
export function addTarget(target: AttackTarget): void {
  const state = loadState() || createEmptyState();
  
  // Check if target already exists
  const existingIndex = state.targets.findIndex(t => t.ip === target.ip);
  
  if (existingIndex >= 0) {
    // Update existing
    state.targets[existingIndex] = target;
  } else {
    // Add new
    state.targets.push(target);
  }

  state.active = true;
  saveState(state);
}

/**
 * Remove target from attack state
 */
export function removeTarget(ip: string): void {
  const state = loadState();
  
  if (!state) {
    return;
  }

  state.targets = state.targets.filter(t => t.ip !== ip);
  
  if (state.targets.length === 0) {
    state.active = false;
    deleteState();
  } else {
    saveState(state);
  }
}

/**
 * Get all active targets
 */
export function getTargets(): AttackTarget[] {
  const state = loadState();
  return state?.targets || [];
}

/**
 * Check if any attack is active
 */
export function isAttackActive(): boolean {
  const state = loadState();
  return state?.active === true && state.targets.length > 0;
}

/**
 * Get specific target info
 */
export function getTarget(ip: string): AttackTarget | null {
  const state = loadState();
  return state?.targets.find(t => t.ip === ip) || null;
}

/**
 * Clear all state
 */
export function clearState(): void {
  deleteState();
}

/**
 * Create empty state
 */
function createEmptyState(): AttackState {
  return {
    active: false,
    targets: [],
    interface: '',
    gateway: '',
    startTime: new Date().toISOString(),
  };
}

/**
 * Update state with network info
 */
export function updateNetworkInfo(iface: string, gateway: string): void {
  const state = loadState() || createEmptyState();
  state.interface = iface;
  state.gateway = gateway;
  saveState(state);
}

/**
 * Get attack duration for target
 */
export function getAttackDuration(ip: string): string {
  const target = getTarget(ip);
  
  if (!target) {
    return '0s';
  }

  const start = new Date(target.startTime);
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
 * Format state for display
 */
export function formatState(): string {
  const state = loadState();
  
  if (!state || state.targets.length === 0) {
    return 'No active attacks';
  }

  let output = `Active Attacks: ${state.targets.length}\n`;
  output += `Interface: ${state.interface}\n`;
  output += `Gateway: ${state.gateway}\n\n`;

  for (const target of state.targets) {
    output += `Target: ${target.ip}\n`;
    output += `  MAC: ${target.mac}\n`;
    output += `  Duration: ${getAttackDuration(target.ip)}\n`;
    output += `  Rules: ${target.rules.tc.length + target.rules.iptables.length + target.rules.netem.length} active\n\n`;
  }

  return output;
}