/**
 * @fileoverview Entry point for the Execution Academy
 * 
 * Exports all public APIs for the neuro-symbolic training system.
 * 
 * @license W3C Software and Document License
 */

'use strict';

// Core Academy classes
export {
  ExecutionAcademy,
  Department,
  Role,
  Employee,
  TaskBoard,
  Task,
  DelegationContext,
  JointVenture,
  TrainingYard
} from './academy.js';

// Explainability layer
export {
  ExplainableWorker,
  Decision,
  Skill,
  SkillTree,
  CommitmentChain
} from './explainable-worker.js';

// Niche construction engine
export {
  NicheConstructor,
  Observation,
  Pattern,
  Hypothesis,
  Experiment,
  KnowledgeSharingAgreement
} from './niche-constructor.js';

// Default export: main academy class
import ExecutionAcademy from './academy.js';
export default ExecutionAcademy;
