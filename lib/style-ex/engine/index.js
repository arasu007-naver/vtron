/**
 * STMX — Dedicated 40-Parameter Garment-Level Vision Extraction Producer V1
 * Public entry. Observation producer only (Observation ≠ Consumption · G40).
 * Model invocation is injected via opts.visionFn (model-agnostic · D7).
 */
'use strict';
const rules = require('./producer_rules_v1');
const prompt = require('./producer_prompt_v1');
const adapter = require('./producer_model_adapter_v1');
const validator = require('./producer_validator_v1');
const controller = require('./producer_controller_v1');

module.exports = {
  runProducer: controller.runProducer,
  governTarget: controller.governTarget,
  validateRecord: validator.validateRecord,
  buildPrompt: prompt.buildPrompt,
  runOneCall: adapter.runOneCall,
  rules,
};
