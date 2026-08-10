import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import ftp from 'basic-ftp';
import https from 'https';

const ZIP_NAME = 'investmant_upload.zip';

async function createZip() {
    return new Promise((resolve, reject) => {
        console.log("Creating ZIP archive...");
        const output = fs.createWriteStream(ZIP_NAME);
        const { ZipArchive } = require('archiver');
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`ZIP created successfully! Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Add built frontend files
        if (fs.existsSync('dist')) {
            archive.directory('dist/', 'dist');
            console.log('✓ dist/ directory added');
        }

        // Add server and wrapper files
        const filesToAdd = [
            'server.js',
            'server.js.map',
            'server.cjs',
            '.htaccess',
            'package.json',
            'serviceAccountKey.json',
            '.env'
        ];

        filesToAdd.forEach(file => {
            if (fs.existsSync(file)) {
                archive.file(file, { name: file });
                console.log(`✓ ${file} added`);
            } else {
                console.warn(`⚠️ Warning: ${file} not found!`);
            }
        });

        archive.finalize();
    });
}

async function uploadAndExtract() {
    const client = new ftp.Client();
    try {
        console.log("Connecting to Hostinger FTP...");
        await client.access({
            host: "82.29.191.97",
            user: "u491694131.chatwizs.com",
            password: "t@7Z~BR$ydK",
            secure: false
        });

        console.log("Navigating to root directory...");
        try { await client.cd(".."); } catch (e) { console.log("Failed to cd to ..", e.message); }
        console.log("Ensuring nodejs-investmant directory exists...");
        await client.ensureDir("nodejs-investmant");

        console.log("Uploading investmant_upload.zip (this might take a minute)...");
        client.trackProgress(info => {
            console.log(`Uploaded ${(info.bytes / 1024 / 1024).toFixed(2)} MB`);
        });
        await client.uploadFrom(ZIP_NAME, ZIP_NAME);
        client.trackProgress(); // disable progress tracker

        console.log("Navigating to public_html...");
        await client.cd("/public_html");

        console.log("Writing unzip-investmant.php locally...");
        const phpCode = `<?php
header('Content-Type: text/plain');
$zipFile = '../nodejs-investmant/investmant_upload.zip';
$extractPath = '../nodejs-investmant/';

if (!file_exists($zipFile)) {
    die("Error: ZIP file not found at " . $zipFile);
}

$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    if (!file_exists($extractPath)) {
        mkdir($extractPath, 0755, true);
    }
    $zip->extractTo($extractPath);
    $zip->close();
    echo "Success: Unzipped to " . $extractPath . "\\n";
    
    // Trigger restart
    $restartFile = $extractPath . 'tmp/restart.txt';
    if (!file_exists($extractPath . 'tmp')) {
        mkdir($extractPath . 'tmp', 0755, true);
    }
    file_put_contents($restartFile, time());
    echo "Success: Application restart triggered.\\n";
} else {
    echo "Error: Failed to open ZIP archive.\\n";
}
?>`;

        fs.writeFileSync('unzip-investmant.php', phpCode);

        console.log("Uploading unzip-investmant.php to public_html...");
        await client.uploadFrom('unzip-investmant.php', 'unzip-investmant.php');

        console.log("Triggering extraction script via HTTP GET...");
        https.get('https://chatwizs.com/unzip-investmant.php', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log("\n=== Extraction Response ===");
                console.log(data);
                console.log("===========================\n");
                console.log("Deployment finished successfully!");
                console.log("Domain: investmant.chatwizs.com");
                
                // Cleanup local files
                try {
                    fs.unlinkSync(ZIP_NAME);
                    fs.unlinkSync('unzip-investmant.php');
                } catch(e) {}
            });
        }).on('error', err => {
            console.error("HTTP Trigger Error:", err);
        });

    } catch (err) {
        console.error("Deployment failed:", err);
    } finally {
        client.close();
    }
}

async function main() {
    await createZip();
    await uploadAndExtract();
}

main();
