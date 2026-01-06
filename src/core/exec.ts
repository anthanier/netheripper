import { exec as nodeExec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(nodeExec);

export interface ExecOptions {
  ignoreError?: boolean;
  timeout?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

/**
 * Execute shell command with error handling
 */
export async function exec(
  command: string,
  options: ExecOptions = {}
): Promise<ExecResult> {
  const { ignoreError = false, timeout = 10000 } = options;

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      success: true,
    };
  } catch (error: any) {
    if (ignoreError) {
      return {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || '',
        success: false,
      };
    }

    throw new Error(
      error.stderr?.trim() || error.stdout?.trim() || error.message || 'Command failed'
    );
  }
}

/**
 * Execute command and get only stdout
 */
export async function execSimple(command: string): Promise<string> {
  const result = await exec(command);
  return result.stdout;
}

/**
 * Check if command exists
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    await exec(`which ${command}`, { ignoreError: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if running as root
 */
export function isRoot(): boolean {
  return process.getuid?.() === 0;
}

/**
 * Require root privileges
 */
export function requireRoot(): void {
  if (!isRoot()) {
    throw new Error('This operation requires root privileges. Run with sudo.');
  }
}

/**
 * Check system dependencies
 */
export async function checkDependencies(): Promise<string[]> {
  const required = ['ip', 'tc', 'iptables', 'sysctl'];
  const missing: string[] = [];

  for (const cmd of required) {
    if (!(await commandExists(cmd))) {
      missing.push(cmd);
    }
  }

  return missing;
}

/**
 * Check optional tools for better performance
 */
export async function checkOptionalTools(): Promise<{
  arpScan: boolean;
  nmap: boolean;
}> {
  return {
    arpScan: await commandExists('arp-scan'),
    nmap: await commandExists('nmap'),
  };
}