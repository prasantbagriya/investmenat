const fs = require('fs');
const files = [
  'e:/investmenat-main/investmenat-main/server.ts',
  'e:/investmenat-main/investmenat-main/src/components/CryptoWalletView.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Save specific strings we DO NOT want to touch
  content = content.replace(/GOOGLE_SERVICE_ACCOUNT_EMAIL/g, '__KEEP_G_SA_E__');
  content = content.replace(/gmail\.googleapis\.com/g, '__KEEP_GMAIL_API__');
  
  // Replace variables and text
  content = content.replace(/boundEmail/g, 'boundRoute');
  content = content.replace(/BoundEmail/g, 'BoundRoute');
  content = content.replace(/sendEmail/g, 'sendRoute');
  content = content.replace(/SendEmail/g, 'SendRoute');
  content = content.replace(/e2eEmail/g, 'e2eNode');
  content = content.replace(/E2EEmail/g, 'E2ENode');
  content = content.replace(/setupTotpEmail/g, 'setupTotpRoute');
  content = content.replace(/emailHash/g, 'nodeHash');
  content = content.replace(/saEmail/g, 'saAccount');
  content = content.replace(/emailLines/g, 'msgLines');
  content = content.replace(/emailToUse/g, 'routeToUse');
  content = content.replace(/decryptNetworkEmail/g, 'decryptNetworkNode');
  content = content.replace(/hashEmail/g, 'hashNode');
  content = content.replace(/setupBoundEmail/g, 'setupBoundRoute');
  content = content.replace(/SetupBoundEmail/g, 'SetupBoundRoute');
  
  // Restore saved strings
  content = content.replace(/__KEEP_G_SA_E__/g, 'GOOGLE_SERVICE_ACCOUNT_EMAIL');
  content = content.replace(/__KEEP_GMAIL_API__/g, 'gmail.googleapis.com');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed ' + file);
}
