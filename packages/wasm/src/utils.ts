/**
 * Reads an environment variable (in Node environment only).
 */
export function readEnv(env: string): string | undefined {
  if (typeof process !== 'undefined') {
    return process.env?.[env]?.trim() ?? undefined;
  }
  return undefined;
}

export default { readEnv };
