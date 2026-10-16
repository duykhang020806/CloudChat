const ITERATIONS = 100000;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return `pbkdf2:${ITERATIONS}:${toBase64(salt.buffer)}:${toBase64(derivedBits)}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(":");

  if (parts.length !== 4) {
    return false;
  }

  const [algorithm, iterationsString, saltBase64, hashBase64] = parts;

  if (algorithm !== "pbkdf2") {
    return false;
  }

  const iterations = Number(iterationsString);

  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = fromBase64(saltBase64);
  const expectedHash = fromBase64(hashBase64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const actualHash = new Uint8Array(derivedBits);

  if (actualHash.length !== expectedHash.length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < actualHash.length; i++) {
    difference |= actualHash[i] ^ expectedHash[i];
  }

  return difference === 0;
}