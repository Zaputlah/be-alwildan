import { describe, expect, it } from 'vitest';
import { hashPassword, hashToken, randomToken, verifyPassword } from '../src/common/crypto.js';
describe('security helpers', () => {
    it('hashes passwords with a unique salt and verifies the original value', async () => {
        const first = await hashPassword('Integration123!');
        const second = await hashPassword('Integration123!');
        expect(first).not.toBe(second);
        expect(await verifyPassword('Integration123!', first)).toBe(true);
        expect(await verifyPassword('incorrect-password', first)).toBe(false);
    });
    it('creates random opaque tokens and deterministic token hashes', () => {
        const token = randomToken();
        expect(token.length).toBeGreaterThan(30);
        expect(hashToken(token)).toHaveLength(64);
        expect(hashToken(token)).toBe(hashToken(token));
    });
});
