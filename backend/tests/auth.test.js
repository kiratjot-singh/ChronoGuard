const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('Auth Utilities - Hashing & Token JWT', async (t) => {
  await t.test('should hash and compare passwords correctly', async () => {
    const password = 'mySecretPassword123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    assert.ok(hash);
    assert.notStrictEqual(password, hash);

    const isMatch = await bcrypt.compare(password, hash);
    assert.strictEqual(isMatch, true);

    const isFail = await bcrypt.compare('wrongPassword', hash);
    assert.strictEqual(isFail, false);
  });

  await t.test('should sign and verify JWT tokens correctly', () => {
    const userId = '507f1f77bcf86cd799439011';
    const secret = 'test_secret_key';
    
    const token = jwt.sign({ id: userId }, secret, { expiresIn: '1h' });
    assert.ok(token);

    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, userId);
  });
});
