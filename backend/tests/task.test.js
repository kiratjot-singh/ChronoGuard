const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Task = require('../src/models/Task');

test('Task Model - Validation & Instantiation', async (t) => {
  await t.test('should validate correct task structure', () => {
    const task = new Task({
      user: new mongoose.Types.ObjectId(),
      title: 'Complete Project',
      deadline: 'Tomorrow',
      priority: 'high',
      estimated_hours: 4,
      subtasks: ['Setup database', 'Write controllers']
    });

    assert.strictEqual(task.title, 'Complete Project');
    assert.strictEqual(task.deadline, 'Tomorrow');
    assert.strictEqual(task.priority, 'high');
    assert.strictEqual(task.estimated_hours, 4);
    assert.deepStrictEqual(task.subtasks, ['Setup database', 'Write controllers']);
  });

  await t.test('should fail validation if required fields are missing', () => {
    const task = new Task({
      priority: 'medium'
    });
    
    const error = task.validateSync();
    assert.ok(error);
    assert.ok(error.errors['user']);
    assert.ok(error.errors['title']);
    assert.ok(error.errors['deadline']);
  });
});
