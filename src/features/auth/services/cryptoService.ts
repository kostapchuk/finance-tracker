const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 16
const HASH_LENGTH = 32

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return arrayBufferToBase64(salt.buffer)
}

export async function hashPassphrase(
  passphrase: string,
  salt: string
): Promise<string> {
  const encoder = new TextEncoder()
  const passphraseBuffer = encoder.encode(passphrase)
  const saltBuffer = base64ToArrayBuffer(salt)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passphraseBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  )

  return arrayBufferToBase64(derivedBits)
}

export async function verifyPassphrase(
  passphrase: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashPassphrase(passphrase, salt)
  return computedHash === storedHash
}
