import * as migration_20260731_203652_initial from './20260731_203652_initial';

export const migrations = [
  {
    up: migration_20260731_203652_initial.up,
    down: migration_20260731_203652_initial.down,
    name: '20260731_203652_initial'
  },
];
