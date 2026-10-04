'use strict';
/*
 * PROVISIONAL TEST PROFILE — Migration stage expectations, TEST-ONLY.
 * NOT an Architecture Source of Truth. NOT domain vocabulary. Runtime does NOT consume this.
 * Update this ONE file as each layer is migrated; tests read it for expected layer status.
 */
const { LAYER_STATUS } = require('../04_CLEAN_ENGINE_CODE/src/runtime/packages');

// Sprint 3: L1, L2 implemented; L3..L8 skeleton.
const STAGES = Object.freeze({
  L1: LAYER_STATUS.OK,
  L2: LAYER_STATUS.OK,
  L3: LAYER_STATUS.NOT_IMPLEMENTED,
  L4: LAYER_STATUS.NOT_IMPLEMENTED,
  L5: LAYER_STATUS.NOT_IMPLEMENTED,
  L6: LAYER_STATUS.NOT_IMPLEMENTED,
  L7: LAYER_STATUS.NOT_IMPLEMENTED,
  L8: LAYER_STATUS.NOT_IMPLEMENTED,
});

module.exports = { PROVISIONAL_TEST_PROFILE: true, STAGES };
