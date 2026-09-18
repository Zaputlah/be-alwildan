import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const randomToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64));
    return `scrypt$${salt}$${derived.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
    const [algorithm, salt, expectedHex] = stored.split('$');
    if (algorithm !== 'scrypt' || !salt || !expectedHex)
        return false;
    const actual = (await scrypt(password, salt, 64));
    const expected = Buffer.from(expectedHex, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}
