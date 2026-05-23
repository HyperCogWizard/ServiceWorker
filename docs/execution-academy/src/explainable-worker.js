/**
 * @fileoverview ExplainableWorker - Human-readable execution explainability layer
 * 
 * Provides natural language explanations for every execution decision,
 * implementing the Execution Explanation Panel concept from the Academy.
 * 
 * @license W3C Software and Document License
 * @see https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 */

'use strict';

import { ExecutionAcademy, Role, Task } from './academy.js';

/**
 * Decision record for explanations
 */
class Decision {
  /**
   * @param {string} operationId - Unique operation identifier
   * @param {string} operationType - Type of operation (fetch, cache, compute, etc.)
   * @param {Object} context - Decision context
   */
  constructor(operationId, operationType, context = {}) {
    this.operationId = operationId;
    this.operationType = operationType;
    this.context = context;
    this.timestamp = Date.now();
    this.factors = [];
    this.alternativesConsidered = [];
    this.chosenPath = null;
    this.confidence = 0;
    this.narrative = '';
  }

  /**
   * Add a decision factor
   * @param {string} name - Factor name
   * @param {*} value - Factor value
   * @param {number} weight - Factor weight in decision
   */
  addFactor(name, value, weight = 1) {
    this.factors.push({ name, value, weight });
    return this;
  }

  /**
   * Add an alternative that was considered
   * @param {string} alternative - Alternative path
   * @param {string} rejectionReason - Why it was rejected
   */
  addAlternative(alternative, rejectionReason) {
    this.alternativesConsidered.push({ alternative, rejectionReason });
    return this;
  }

  /**
   * Set the chosen path
   * @param {string} path - Chosen execution path
   * @param {number} confidence - Confidence level (0-1)
   */
  choose(path, confidence) {
    this.chosenPath = path;
    this.confidence = confidence;
    return this;
  }

  /**
   * Generate narrative explanation
   * @returns {string}
   */
  generateNarrative() {
    const parts = [];
    
    // Opening
    parts.push(`Operation: ${this.operationType}`);
    
    // Context
    if (this.context.requester) {
      parts.push(`The ${this.context.requester} requested this operation.`);
    }
    
    // Factors considered
    if (this.factors.length > 0) {
      parts.push('Decision factors:');
      this.factors.forEach(f => {
        parts.push(`  • ${f.name}: ${f.value}`);
      });
    }
    
    // Chosen path
    if (this.chosenPath) {
      parts.push(`Chosen strategy: ${this.chosenPath}`);
      parts.push(`Confidence: ${(this.confidence * 100).toFixed(1)}%`);
    }
    
    // Alternatives
    if (this.alternativesConsidered.length > 0) {
      parts.push('Alternatives considered:');
      this.alternativesConsidered.forEach(alt => {
        parts.push(`  • ${alt.alternative}: ${alt.rejectionReason}`);
      });
    }
    
    this.narrative = parts.join('\n');
    return this.narrative;
  }
}

/**
 * Skill in a skill tree
 */
class Skill {
  /**
   * @param {string} name - Skill name
   * @param {string} category - Skill category
   * @param {Skill[]} prerequisites - Required prerequisite skills
   */
  constructor(name, category, prerequisites = []) {
    this.name = name;
    this.category = category;
    this.prerequisites = prerequisites;
    this.proficiency = 0; // 0-5 stars
    this.usageCount = 0;
    this.successCount = 0;
    this.children = [];
  }

  /**
   * Record skill usage
   * @param {boolean} success - Whether usage was successful
   */
  recordUsage(success) {
    this.usageCount++;
    if (success) {
      this.successCount++;
      // Gain proficiency on success
      this.proficiency = Math.min(5, this.proficiency + 0.01);
    } else {
      // Slight decrease on failure
      this.proficiency = Math.max(0, this.proficiency - 0.005);
    }
    return this;
  }

  /**
   * Check if skill is unlocked (prerequisites met)
   * @returns {boolean}
   */
  isUnlocked() {
    return this.prerequisites.every(p => p.proficiency >= 1);
  }

  /**
   * Get skill display
   * @returns {string}
   */
  getDisplay() {
    const stars = '★'.repeat(Math.floor(this.proficiency)) + 
                  '☆'.repeat(5 - Math.floor(this.proficiency));
    const locked = this.isUnlocked() ? '' : ' 🔒';
    return `${this.name} ${stars}${locked}`;
  }
}

/**
 * SkillTree - collection of skills with dependencies
 */
class SkillTree {
  /**
   * @param {string} name - Tree name (e.g., "Fetch Specialist")
   */
  constructor(name) {
    this.name = name;
    this.skills = new Map();
    this.rootSkills = [];
  }

  /**
   * Add a skill to the tree
   * @param {Skill} skill - Skill to add
   * @param {Skill} parent - Parent skill (optional)
   */
  addSkill(skill, parent = null) {
    this.skills.set(skill.name, skill);
    
    if (parent) {
      parent.children.push(skill);
    } else {
      this.rootSkills.push(skill);
    }
    
    return skill;
  }

  /**
   * Get skill by name
   * @param {string} name - Skill name
   * @returns {Skill|undefined}
   */
  getSkill(name) {
    return this.skills.get(name);
  }

  /**
   * Get tree visualization
   * @returns {string}
   */
  visualize() {
    const lines = [`┌─ ${this.name} ─┐`];
    
    const renderSkill = (skill, prefix = '') => {
      lines.push(`${prefix}├── ${skill.getDisplay()}`);
      skill.children.forEach((child, idx) => {
        const isLast = idx === skill.children.length - 1;
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        renderSkill(child, newPrefix);
      });
    };
    
    this.rootSkills.forEach(skill => renderSkill(skill));
    lines.push('└' + '─'.repeat(this.name.length + 4) + '┘');
    
    return lines.join('\n');
  }

  /**
   * Get proficiency summary
   * @returns {Object}
   */
  getSummary() {
    const skills = Array.from(this.skills.values());
    const totalProficiency = skills.reduce((sum, s) => sum + s.proficiency, 0);
    const maxProficiency = skills.length * 5;
    
    return {
      name: this.name,
      skillCount: skills.length,
      unlockedCount: skills.filter(s => s.isUnlocked()).length,
      averageProficiency: totalProficiency / skills.length,
      completionPercent: (totalProficiency / maxProficiency * 100).toFixed(1)
    };
  }
}

/**
 * ExplainableWorker - main interface for explainability
 * Extends ServiceWorker conceptually with explanation capabilities
 */
class ExplainableWorker {
  /**
   * @param {ExecutionAcademy} academy - Parent academy
   */
  constructor(academy) {
    this.academy = academy;
    this.decisions = new Map(); // operationId → Decision
    this.skillTrees = new Map(); // treeName → SkillTree
    this.explanationHistory = [];
    
    // Initialize default skill trees
    this._initializeSkillTrees();
  }

  /**
   * Initialize default skill trees for Service Worker operations
   * @private
   */
  _initializeSkillTrees() {
    // Fetch Specialist Skill Tree
    const fetchTree = new SkillTree('Fetch Specialist');
    
    const fetchBase = fetchTree.addSkill(new Skill('FETCH', 'core'));
    fetchBase.proficiency = 5; // Base skill is maxed
    
    const cacheFirst = fetchTree.addSkill(
      new Skill('CACHE-FIRST', 'strategy', [fetchBase]), 
      fetchBase
    );
    const networkFirst = fetchTree.addSkill(
      new Skill('NETWORK-FIRST', 'strategy', [fetchBase]), 
      fetchBase
    );
    const staleWhileRevalidate = fetchTree.addSkill(
      new Skill('STALE-WHILE-REVALIDATE', 'strategy', [fetchBase]), 
      fetchBase
    );
    
    fetchTree.addSkill(
      new Skill('PREDICTIVE-PREFETCH', 'optimization', [cacheFirst]), 
      cacheFirst
    );
    fetchTree.addSkill(
      new Skill('ADAPTIVE-TIMEOUT', 'optimization', [networkFirst]), 
      networkFirst
    );
    
    this.skillTrees.set('fetch', fetchTree);

    // Cache Manager Skill Tree
    const cacheTree = new SkillTree('Cache Manager');
    
    const cacheBase = cacheTree.addSkill(new Skill('CACHE-API', 'core'));
    cacheBase.proficiency = 5;
    
    const cacheMatch = cacheTree.addSkill(
      new Skill('CACHE-MATCH', 'operation', [cacheBase]), 
      cacheBase
    );
    const cachePut = cacheTree.addSkill(
      new Skill('CACHE-PUT', 'operation', [cacheBase]), 
      cacheBase
    );
    const cacheDelete = cacheTree.addSkill(
      new Skill('CACHE-DELETE', 'operation', [cacheBase]), 
      cacheBase
    );
    
    cacheTree.addSkill(
      new Skill('CACHE-VERSIONING', 'advanced', [cacheMatch, cachePut]), 
      cachePut
    );
    cacheTree.addSkill(
      new Skill('CACHE-CLEANUP', 'advanced', [cacheDelete]), 
      cacheDelete
    );
    
    this.skillTrees.set('cache', cacheTree);

    // Event Handler Skill Tree
    const eventTree = new SkillTree('Event Handler');
    
    const eventBase = eventTree.addSkill(new Skill('EVENT-LISTENER', 'core'));
    eventBase.proficiency = 5;
    
    const installEvent = eventTree.addSkill(
      new Skill('INSTALL-EVENT', 'lifecycle', [eventBase]), 
      eventBase
    );
    const activateEvent = eventTree.addSkill(
      new Skill('ACTIVATE-EVENT', 'lifecycle', [eventBase]), 
      eventBase
    );
    const fetchEvent = eventTree.addSkill(
      new Skill('FETCH-EVENT', 'functional', [eventBase]), 
      eventBase
    );
    const messageEvent = eventTree.addSkill(
      new Skill('MESSAGE-EVENT', 'functional', [eventBase]), 
      eventBase
    );
    
    eventTree.addSkill(
      new Skill('SKIP-WAITING', 'advanced', [installEvent, activateEvent]), 
      activateEvent
    );
    eventTree.addSkill(
      new Skill('CLIENTS-CLAIM', 'advanced', [activateEvent]), 
      activateEvent
    );
    
    this.skillTrees.set('event', eventTree);
  }

  /**
   * Record a decision for later explanation
   * @param {string} operationId - Operation identifier
   * @param {string} operationType - Type of operation
   * @param {Object} context - Decision context
   * @returns {Decision}
   */
  recordDecision(operationId, operationType, context = {}) {
    const decision = new Decision(operationId, operationType, context);
    this.decisions.set(operationId, decision);
    return decision;
  }

  /**
   * Get explanation for a specific operation
   * @param {string} operationId - Operation identifier
   * @returns {Object} Human-readable explanation
   */
  getDecisionExplanation(operationId) {
    const decision = this.decisions.get(operationId);
    
    if (!decision) {
      return {
        error: 'Decision not found',
        operationId,
        suggestion: 'The operation may have completed before tracking started.'
      };
    }

    const explanation = {
      operationId,
      operationType: decision.operationType,
      timestamp: new Date(decision.timestamp).toISOString(),
      
      narrative: decision.generateNarrative(),
      
      decisionFactors: decision.factors.map(f => ({
        factor: f.name,
        value: String(f.value),
        weight: `${(f.weight * 100).toFixed(0)}%`
      })),
      
      alternativePaths: decision.alternativesConsidered.map(alt => ({
        path: alt.alternative,
        rejectionReason: alt.rejectionReason
      })),
      
      chosenStrategy: decision.chosenPath,
      confidence: `${(decision.confidence * 100).toFixed(1)}%`,
      
      basedOnSimilarDecisions: this._findSimilarDecisions(decision).length
    };

    // Store in history
    this.explanationHistory.push({
      timestamp: Date.now(),
      operationId,
      explanation
    });

    return explanation;
  }

  /**
   * Find similar past decisions
   * @param {Decision} decision - Current decision
   * @returns {Decision[]}
   * @private
   */
  _findSimilarDecisions(decision) {
    const similar = [];
    
    for (const [id, past] of this.decisions) {
      if (id === decision.operationId) continue;
      
      // Check similarity based on operation type and factors
      if (past.operationType === decision.operationType) {
        const sharedFactors = past.factors.filter(pf => 
          decision.factors.some(df => df.name === pf.name)
        );
        if (sharedFactors.length >= decision.factors.length * 0.5) {
          similar.push(past);
        }
      }
    }
    
    return similar;
  }

  /**
   * Get skill tree for a category
   * @param {string} category - Skill category (fetch, cache, event)
   * @returns {Object} Skill tree information
   */
  getSkillTree(category = 'fetch') {
    const tree = this.skillTrees.get(category);
    
    if (!tree) {
      return {
        error: 'Skill tree not found',
        category,
        available: Array.from(this.skillTrees.keys())
      };
    }

    return {
      category,
      visualization: tree.visualize(),
      summary: tree.getSummary(),
      skills: Array.from(tree.skills.values()).map(s => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        proficiencyDisplay: s.getDisplay(),
        unlocked: s.isUnlocked(),
        usageCount: s.usageCount,
        successRate: s.usageCount > 0 
          ? `${(s.successCount / s.usageCount * 100).toFixed(1)}%` 
          : 'N/A'
      }))
    };
  }

  /**
   * Get all skill trees
   * @returns {Object}
   */
  getAllSkillTrees() {
    const trees = {};
    
    for (const [name, tree] of this.skillTrees) {
      trees[name] = {
        visualization: tree.visualize(),
        summary: tree.getSummary()
      };
    }
    
    return trees;
  }

  /**
   * Record skill usage
   * @param {string} treeName - Skill tree name
   * @param {string} skillName - Skill name
   * @param {boolean} success - Whether usage was successful
   */
  recordSkillUsage(treeName, skillName, success) {
    const tree = this.skillTrees.get(treeName);
    if (tree) {
      const skill = tree.getSkill(skillName);
      if (skill) {
        skill.recordUsage(success);
      }
    }
    return this;
  }

  /**
   * Get adaptation suggestions from niche constructor
   * @returns {Object[]} Array of suggestions
   */
  getAdaptationSuggestions() {
    if (this.academy?.nicheConstructor) {
      return this.academy.nicheConstructor.getSuggestions();
    }
    
    // Generate basic suggestions from skill data
    const suggestions = [];
    
    for (const [name, tree] of this.skillTrees) {
      const summary = tree.getSummary();
      
      // Suggest unlocking skills if many are locked
      const lockedCount = summary.skillCount - summary.unlockedCount;
      if (lockedCount > 0) {
        suggestions.push({
          type: 'skill-unlock',
          tree: name,
          message: `${lockedCount} skills are still locked in ${tree.name}. ` +
                   `Focus on prerequisite skills to unlock new capabilities.`,
          priority: 'medium'
        });
      }
      
      // Suggest practice for low proficiency
      if (summary.averageProficiency < 2) {
        suggestions.push({
          type: 'skill-practice',
          tree: name,
          message: `Average proficiency in ${tree.name} is ${summary.averageProficiency.toFixed(1)}/5. ` +
                   `More practice recommended.`,
          priority: 'low'
        });
      }
    }
    
    // Suggest based on decision patterns
    const recentDecisions = Array.from(this.decisions.values())
      .filter(d => Date.now() - d.timestamp < 3600000) // Last hour
      .slice(-100);
    
    if (recentDecisions.length > 50) {
      const typeFreq = new Map();
      recentDecisions.forEach(d => {
        typeFreq.set(d.operationType, (typeFreq.get(d.operationType) || 0) + 1);
      });
      
      const mostCommon = Array.from(typeFreq.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      if (mostCommon && mostCommon[1] > recentDecisions.length * 0.5) {
        suggestions.push({
          type: 'pattern-detected',
          pattern: mostCommon[0],
          message: `${mostCommon[0]} operations account for ${(mostCommon[1] / recentDecisions.length * 100).toFixed(0)}% ` +
                   `of recent activity. Consider creating a FastPath optimization.`,
          priority: 'high'
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Generate comprehensive explanation panel
   * @param {string} operationId - Operation to explain
   * @returns {string} Formatted explanation panel
   */
  generateExplanationPanel(operationId) {
    const explanation = this.getDecisionExplanation(operationId);
    
    if (explanation.error) {
      return `
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 EXECUTION EXPLANATION PANEL                                     │
├─────────────────────────────────────────────────────────────────────┤
│  ⚠️  ${explanation.error}                                            
│  Operation ID: ${operationId}
│  ${explanation.suggestion || ''}
└─────────────────────────────────────────────────────────────────────┘`;
    }

    const factors = explanation.decisionFactors
      .map(f => `│  ├── ${f.factor}: ${f.value}`)
      .join('\n');
    
    const alternatives = explanation.alternativePaths
      .map(alt => `│  ├── ${alt.path}: ${alt.rejectionReason}`)
      .join('\n');

    return `
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 EXECUTION EXPLANATION PANEL                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      
│  Current Operation: ${explanation.operationType}
│  Operation ID: ${operationId}
│                                                                      
│  📖 NARRATIVE EXPLANATION:                                          
│  ─────────────────────────                                          
${explanation.narrative.split('\n').map(line => `│  ${line}`).join('\n')}
│                                                                      
│  🧠 DECISION FACTORS:                                               
${factors}
│                                                                      
│  🔄 ALTERNATIVE PATHS CONSIDERED:                                   
${alternatives || '│  └── None'}
│                                                                      
│  📊 CONFIDENCE: ${explanation.confidence} (based on ${explanation.basedOnSimilarDecisions} similar decisions)
│                                                                      
└─────────────────────────────────────────────────────────────────────┘`;
  }
}

/**
 * CommitmentChain - Typed Promise Logic as Commitment Protocols
 * Wraps promises with confidence scoring and adaptive fallbacks
 */
class CommitmentChain {
  /**
   * @param {string} description - Human-readable commitment description
   * @param {Function} executor - Promise executor
   */
  constructor(description, executor) {
    this.commitments = [{
      description,
      confidence: 1.0,
      fallbackPlan: null,
      state: 'pending'
    }];
    
    this.executor = executor;
    this.adaptations = [];
  }

  /**
   * Set confidence level for current commitment
   * @param {number} level - Confidence (0-1)
   * @param {string} reason - Reason for confidence level
   */
  withConfidence(level, reason) {
    const current = this.commitments[this.commitments.length - 1];
    current.confidence = level;
    current.confidenceReason = reason;
    return this;
  }

  /**
   * Set fallback plan
   * @param {string} description - Fallback description
   * @param {Function} fallback - Fallback function
   */
  withFallback(description, fallback) {
    const current = this.commitments[this.commitments.length - 1];
    current.fallbackPlan = { description, handler: fallback };
    return this;
  }

  /**
   * Add follow-up commitment (then)
   * @param {string} description - Commitment description
   * @param {Function} handler - Handler function
   */
  thenCommit(description, handler) {
    // Calculate propagated confidence
    const prevConfidence = this.commitments[this.commitments.length - 1].confidence;
    
    this.commitments.push({
      description,
      confidence: prevConfidence * 0.9, // Confidence decays through chain
      fallbackPlan: null,
      state: 'pending',
      handler
    });
    
    return this;
  }

  /**
   * Execute the commitment chain
   * @returns {Promise}
   */
  async execute() {
    let result;
    
    for (let i = 0; i < this.commitments.length; i++) {
      const commitment = this.commitments[i];
      commitment.state = 'executing';
      
      try {
        if (i === 0) {
          result = await this.executor();
        } else {
          result = await commitment.handler(result);
        }
        commitment.state = 'fulfilled';
      } catch (error) {
        commitment.state = 'rejected';
        commitment.error = error;
        
        // Try fallback if available
        if (commitment.fallbackPlan) {
          try {
            this.adaptations.push({
              commitment: commitment.description,
              usedFallback: commitment.fallbackPlan.description
            });
            result = await commitment.fallbackPlan.handler(error, result);
            commitment.state = 'fulfilled-via-fallback';
          } catch (fallbackError) {
            throw fallbackError;
          }
        } else {
          throw error;
        }
      }
    }
    
    return result;
  }

  /**
   * Get chain explanation
   * @returns {string}
   */
  explain() {
    const lines = ['📋 COMMITMENT CHAIN'];
    
    this.commitments.forEach((c, i) => {
      const prefix = i === this.commitments.length - 1 ? '└──' : '├──';
      const emoji = {
        pending: '⏳',
        executing: '🔄',
        fulfilled: '✅',
        'fulfilled-via-fallback': '🔄',
        rejected: '❌'
      }[c.state];
      
      lines.push(`${prefix} ${emoji} ${c.description}`);
      lines.push(`    └── Confidence: ${(c.confidence * 100).toFixed(0)}%`);
      
      if (c.fallbackPlan) {
        lines.push(`    └── Fallback: ${c.fallbackPlan.description}`);
      }
    });
    
    return lines.join('\n');
  }
}

// Export classes
export {
  ExplainableWorker,
  Decision,
  Skill,
  SkillTree,
  CommitmentChain
};

export default ExplainableWorker;
