import { questionCatalog } from './question-catalog';
import type { WorkspaceOnboardingAnswers, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';
import { Injectable } from '@nestjs/common';

const dependentKeys: Partial<Record<keyof WorkspaceOnboardingAnswers, (keyof WorkspaceOnboardingAnswers)[]>> = {
  applicationTypes: ['mobilePlatforms', 'desktopPlatforms', 'technologyPreference'],
  coreFeatures: ['collaboration', 'notifications'],
};

@Injectable()
export class QuestionFlowService {
  applicable(answers: WorkspaceOnboardingAnswers) {
    return questionCatalog
      .filter((question) => !question.visibleWhen || question.visibleWhen(answers))
      .map((question) => ({
        key: question.key,
        prompt: question.prompt,
        type: question.type,
        required: question.required,
        ...(question.options ? { options: question.options } : {}),
      }));
  }

  flow(answers: WorkspaceOnboardingAnswers): WorkspaceQuestionFlowResponse {
    const questions = this.applicable(answers);
    const answered = questions.filter(({ key }) => answers[key] !== undefined);
    const currentQuestion = questions.find(({ key }) => answers[key] === undefined) ?? null;

    return {
      questions,
      currentQuestion,
      completed: answered.length,
      total: questions.length,
      percent: questions.length === 0 ? 100 : Math.round((answered.length / questions.length) * 100),
    };
  }

  removeInvalidDependents(previous: WorkspaceOnboardingAnswers, patch: Partial<WorkspaceOnboardingAnswers>): WorkspaceOnboardingAnswers {
    const next = { ...previous, ...patch };

    for (const changedKey of Object.keys(patch) as (keyof WorkspaceOnboardingAnswers)[]) {
      for (const dependentKey of dependentKeys[changedKey] ?? []) {
        delete next[dependentKey];
      }
    }

    const visibleKeys = new Set(this.applicable(next).map(({ key }) => key));

    for (const key of Object.keys(next) as (keyof WorkspaceOnboardingAnswers)[]) {
      if (!visibleKeys.has(key)) {
        delete next[key];
      }
    }

    return next;
  }
}
