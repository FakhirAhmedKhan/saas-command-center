import type { WorkspaceBlueprint, WorkspaceBlueprintRecommendation, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { Injectable } from '@nestjs/common';

export interface RuleContext {
  answers: WorkspaceOnboardingAnswers;
}

export type WorkspaceBlueprintDraft = WorkspaceBlueprint;

export interface WorkspaceRule {
  id: string;
  version: string;
  priority: number;
  when(context: RuleContext): boolean;
  apply(draft: WorkspaceBlueprintDraft, context: RuleContext): void;
  explanation: string;
}

@Injectable()
export class WorkspaceRuleEngine {
  apply(initial: WorkspaceBlueprintDraft, context: RuleContext, rules: readonly WorkspaceRule[]): WorkspaceBlueprintDraft {
    const seenPriorities = new Map<number, string>();
    const ordered = [...rules].sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));

    for (const rule of ordered) {
      const previousRule = seenPriorities.get(rule.priority);

      if (previousRule && previousRule !== rule.id) {
        throw new Error(`Rule priority conflict: ${previousRule} and ${rule.id} both use ${rule.priority}`);
      }

      seenPriorities.set(rule.priority, rule.id);

      if (!rule.when(context)) {
        continue;
      }

      rule.apply(initial, context);

      const recommendation: WorkspaceBlueprintRecommendation = {
        id: `${rule.id}:${initial.recommendations.length + 1}`,
        ruleId: rule.id,
        title: rule.id.replaceAll('-', ' '),
        explanation: rule.explanation,
      };

      initial.recommendations.push(recommendation);
    }

    return initial;
  }
}
