const { ethers } = require('ethers');
const seed = 'test test test test test test test test test test test junk';
const hdWallet = ethers.HDNodeWallet.fromPhrase(seed, undefined, "m/44'/0'/0'/0/0");
const pubKey = hdWallet.publicKey;
const pubKeyBytes = ethers.getBytes(pubKey);
const sha256_pubKey = ethers.getBytes(ethers.sha256(pubKeyBytes));
const ripemd160_pubKey = ethers.getBytes(ethers.ripemd160(sha256_pubKey));
const networkByte = new Uint8Array([0x00]); // Mainnet
const payload = new Uint8Array(networkByte.length + ripemd160_pubKey.length);
payload.set(networkByte);
payload.set(ripemd160_pubKey, networkByte.length);
const hash1 = ethers.getBytes(ethers.sha256(payload));
const hash2 = ethers.getBytes(ethers.sha256(hash1));
const checksum = hash2.slice(0, 4);
const finalPayload = new Uint8Array(payload.length + checksum.length);
finalPayload.set(payload);
finalPayload.set(checksum, payload.length);
const btcAddress = ethers.encodeBase58(finalPayload);
console.log('BTC Address:', btcAddress);
