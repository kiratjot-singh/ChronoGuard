const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');
const Memory = require('../src/models/Memory');

test('Notification & Memory Schemas validation', async (t) => {
  await t.test('should validate notification model fields', () => {
    const notif = new Notification({
      user: new mongoose.Types.ObjectId(),
      title: 'Calendar Conflict',
      explanation: 'Two meetings overlap.',
      changes: 'Moved focus session.'
    });

    assert.strictEqual(notif.title, 'Calendar Conflict');
    assert.strictEqual(notif.explanation, 'Two meetings overlap.');
    assert.strictEqual(notif.read, false);
  });

  await t.test('should validate memory model default stats', () => {
    const memory = new Memory({
      user: new mongoose.Types.ObjectId()
    });

    assert.strictEqual(memory.averageFocus, 0.0);
    assert.strictEqual(memory.averageCompletionRate, 0.0);
    assert.deepStrictEqual(memory.preferredWorkHours, []);
    assert.strictEqual(memory.observationsCount, 0);
  });
});
