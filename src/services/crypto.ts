/**
 * Simple, robust symmetric encryption/decryption helper using XOR and custom obfuscation.
 * It produces a URL-safe Base64 token so that document IDs are encrypted and not guessable/visible in the URL.
 */

const SECRET_KEY = "cooperacre_secure_key_for_external_sharing_of_protocols";

// Simple XOR cipher that is URL-safe
export function encryptId(id: string): string {
  if (!id) return "";
  // Convert ID to a UTF-8 string, apply XOR with SECRET_KEY
  let result = "";
  for (let i = 0; i < id.length; i++) {
    const charCode = id.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode);
  }
  
  // Convert the binary result to standard Base64, then make it URL-safe
  try {
    const base64 = btoa(unescape(encodeURIComponent(result)));
    return base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, ""); // Remove padding
  } catch (e) {
    console.error("Encryption failed:", e);
    return id;
  }
}

export function decryptId(token: string): string {
  if (!token) return "";
  try {
    // Restore URL-safe characters back to base64
    let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    // Re-add padding if necessary
    while (base64.length % 4) {
      base64 += "=";
    }
    
    const decryptedBinary = decodeURIComponent(escape(atob(base64)));
    let result = "";
    for (let i = 0; i < decryptedBinary.length; i++) {
      const charCode = decryptedBinary.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error("Decryption failed:", e);
    return "";
  }
}
