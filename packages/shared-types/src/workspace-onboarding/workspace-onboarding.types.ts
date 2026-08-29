export const workspaceApplicationTypes = ['WEB', 'MOBILE', 'DESKTOP'] as const;
export type WorkspaceApplicationType = (typeof workspaceApplicationTypes)[number];

export const workspaceProductTypes = ['PRODUCTIVITY_SAAS', 'ECOMMERCE', 'MARKETPLACE', 'SOCIAL', 'INTERNAL_TOOL', 'OTHER'] as const;
export type WorkspaceProductType = (typeof workspaceProductTypes)[number];

export const workspacePlatforms = ['WEB', 'ANDROID', 'IOS', 'WINDOWS', 'MACOS', 'LINUX'] as const;
export type WorkspacePlatform = (typeof workspacePlatforms)[number];

export const workspaceTechnologies = ['NEXT_JS', 'TYPESCRIPT', 'KOTLIN', 'JETPACK_COMPOSE', 'SWIFT', 'SWIFTUI', 'REACT_NATIVE', 'FLUTTER', 'TAURI', 'ELECTRON', 'NEST_JS', 'POSTGRESQL', 'REDIS'] as const;
export type WorkspaceTechnology = (typeof workspaceTechnologies)[number];

export const workspaceEnvironments = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] as const;
export type WorkspaceEnvironment = (typeof workspaceEnvironments)[number];

export const engineeringSystems = ['CI_CD', 'MONITORING', 'ANALYTICS', 'PERFORMANCE', 'ALERTS', 'SECURITY', 'BACKUPS'] as const;
export type EngineeringSystem = (typeof engineeringSystems)[number];

export type WorkspaceQuestionType = 'TEXT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'TECHNOLOGY';

export type WorkspaceGeneratorProvider = 'rules' | 'ai';
export type RepositoryStrategy = 'NONE' | 'CONNECT_LATER' | 'CONNECT_NOW';

export interface WorkspaceOnboardingAnswers {
  productIdea?: string;
  workspaceName?: string;
  productType?: WorkspaceProductType;
  targetUsers?: string[];
  applicationTypes?: WorkspaceApplicationType[];
  coreFeatures?: string[];
  authentication?: boolean;
  collaboration?: boolean;
  notifications?: string[];
  technologyPreference?: Partial<Record<WorkspaceApplicationType, WorkspaceTechnology[]>>;
  mobilePlatforms?: Extract<WorkspacePlatform, 'ANDROID' | 'IOS'>[];
  desktopPlatforms?: Extract<WorkspacePlatform, 'WINDOWS' | 'MACOS' | 'LINUX'>[];
  repositories?: RepositoryStrategy;
  environments?: WorkspaceEnvironment[];
  qualityRequirements?: EngineeringSystem[];
}

export interface WorkspaceQuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface WorkspaceQuestionDefinition {
  key: keyof WorkspaceOnboardingAnswers;
  prompt: string;
  type: WorkspaceQuestionType;
  required: boolean;
  options?: WorkspaceQuestionOption[];
}

export interface WorkspaceQuestionFlowResponse {
  questions: WorkspaceQuestionDefinition[];
  currentQuestion: WorkspaceQuestionDefinition | null;
  completed: number;
  total: number;
  percent: number;
}

export interface WorkspaceBlueprintRecommendation {
  id: string;
  ruleId: string;
  title: string;
  explanation: string;
}

export interface WorkspaceBlueprintApplication {
  type: WorkspaceApplicationType;
  name: string;
  platforms: WorkspacePlatform[];
  stack: WorkspaceTechnology[];
  source: BlueprintValueSource;
}

export interface WorkspaceBlueprint {
  schemaVersion: 1;
  generator: {
    provider: WorkspaceGeneratorProvider;
    version: string;
  };
  workspace: {
    name: string;
    slug: string;
    description: string;
    productType: WorkspaceProductType;
  };
  applications: WorkspaceBlueprintApplication[];
  services: {
    backend: WorkspaceTechnology[];
    database: WorkspaceTechnology[];
    cache: WorkspaceTechnology[];
    authentication: string[];
  };
  features: string[];
  environments: WorkspaceEnvironment[];
  engineeringSystems: EngineeringSystem[];
  recommendations: WorkspaceBlueprintRecommendation[];
  repositories: WorkspaceBlueprintRepository[];
  engineeringConfigurations: WorkspaceBlueprintEngineeringConfiguration[];
}

export interface WorkspaceOnboardingSessionResponse {
  id: string;
  status: 'IN_PROGRESS' | 'BLUEPRINT_READY' | 'CREATING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  currentStep: string | null;
  answers: WorkspaceOnboardingAnswers;
  blueprint: WorkspaceBlueprint | null;
  schemaVersion: number;
  ruleSetVersion: string | null;
  generatorProvider: WorkspaceGeneratorProvider;
  workspaceId: string | null;
  expiresAt: string;
  createdAt: string;
  blueprintRevision: number;
  blueprintHash: string | null;
  updatedAt: string;
}

export type BlueprintValueSource = 'USER' | 'RULE';

export interface WorkspaceBlueprintRepository {
  applicationType: WorkspaceApplicationType;
  strategy: RepositoryStrategy;
  repositoryId?: string;
  placeholderName?: string;
}

export type EngineeringConfigurationState = 'PROPOSED' | 'ACTIVE' | 'UNAVAILABLE';

export interface WorkspaceBlueprintEngineeringConfiguration {
  system: EngineeringSystem;
  state: EngineeringConfigurationState;
  enabledByDefault: boolean;
  explanation: string;
}

export interface WorkspaceBlueprintValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface WorkspaceBlueprintValidationResult {
  valid: boolean;
  revision: number;
  hash: string;
  issues: WorkspaceBlueprintValidationIssue[];
}

export interface UpdateWorkspaceBlueprintInput {
  expectedRevision: number;
  blueprint: WorkspaceBlueprint;
}

export interface ConfirmWorkspaceBlueprintInput {
  expectedRevision: number;
  blueprintHash: string;
  idempotencyKey: string;
}

export interface WorkspaceCreationResult {
  sessionId: string;
  workspaceId: string;
  status: 'COMPLETED';
  createdAt: string;
}
