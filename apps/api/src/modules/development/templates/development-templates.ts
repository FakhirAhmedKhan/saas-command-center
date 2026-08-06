import {
    DevelopmentTemplateType,
    WorkItemPriority,
} from 'src/generated/prisma/enums';

export interface DevelopmentTemplateTask {
    title: string;
    description?: string;
    weight: number;
    priority: WorkItemPriority;
}

export interface DevelopmentTemplateMilestone {
    title: string;
    description: string;
    weight: number;
    tasks: DevelopmentTemplateTask[];
}

export interface DevelopmentTemplateDefinition {
    type: DevelopmentTemplateType;
    label: string;
    description: string;
    milestones: DevelopmentTemplateMilestone[];
}

export const DEVELOPMENT_TEMPLATES: Record<
    DevelopmentTemplateType,
    DevelopmentTemplateDefinition
> = {
    STANDARD_SAAS: {
        type: DevelopmentTemplateType.STANDARD_SAAS,
        label: 'Standard SaaS',
        description:
            'A general SaaS roadmap from product planning through launch.',
        milestones: [
            {
                title: 'Product planning',
                description: 'Define users, problems, scope, requirements and success criteria.',
                weight: 15,
                tasks: [
                    {
                        title: 'Define target users and problem statement',
                        weight: 2,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Document MVP scope and non-goals',
                        weight: 2,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Create product and architecture plan',
                        weight: 3,
                        priority: WorkItemPriority.MEDIUM,
                    },
                ],
            },
            {
                title: 'Technical foundation',
                description: 'Prepare repository, authentication, database and deployment foundations.',
                weight: 25,
                tasks: [
                    {
                        title: 'Set up repository and development environment',
                        weight: 2,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Implement authentication and authorization',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Create database schema and migrations',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Create staging deployment',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Core product',
                description: 'Build the primary user workflows and management interfaces.',
                weight: 40,
                tasks: [
                    {
                        title: 'Implement core backend modules',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Implement core frontend workflows',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add validation and error states',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Complete integration testing',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Launch readiness',
                description: 'Prepare security, monitoring, documentation and production release.',
                weight: 20,
                tasks: [
                    {
                        title: 'Complete security and permissions review',
                        weight: 3,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add monitoring and production health checks',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Complete production deployment',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                ],
            },
        ],
    },

    AI_SAAS: {
        type: DevelopmentTemplateType.AI_SAAS,
        label: 'AI SaaS',
        description:
            'An AI product roadmap including data, models, evaluation and product integration.',
        milestones: [
            {
                title: 'AI product definition',
                description: 'Define the AI use case, limitations, data and evaluation criteria.',
                weight: 15,
                tasks: [
                    {
                        title: 'Define AI use case and expected outputs',
                        weight: 2,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Document safety and failure scenarios',
                        weight: 3,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Define evaluation metrics',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Data and model pipeline',
                description: 'Prepare datasets, model access, prompts and processing services.',
                weight: 30,
                tasks: [
                    {
                        title: 'Prepare data collection and validation',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Integrate model provider or inference service',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Implement prompt and output validation',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Add model usage and cost tracking',
                        weight: 3,
                        priority: WorkItemPriority.MEDIUM,
                    },
                ],
            },
            {
                title: 'Product integration',
                description: 'Connect AI capabilities to secure backend and frontend workflows.',
                weight: 35,
                tasks: [
                    {
                        title: 'Implement AI backend workflow',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Build user-facing AI experience',
                        weight: 5,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Add retries, timeouts and fallbacks',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Protect sensitive data and credentials',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                ],
            },
            {
                title: 'Evaluation and launch',
                description: 'Evaluate quality, latency, safety and production behavior.',
                weight: 20,
                tasks: [
                    {
                        title: 'Run quality evaluation dataset',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Measure latency and cost',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Complete production safety review',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                ],
            },
        ],
    },

    MOBILE: {
        type: DevelopmentTemplateType.MOBILE,
        label: 'Mobile application',
        description:
            'A mobile roadmap covering UX, app architecture, features and store release.',
        milestones: [
            {
                title: 'Product and UX',
                description: 'Define mobile user journeys, navigation and visual design.',
                weight: 15,
                tasks: [
                    {
                        title: 'Define user journeys and screens',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Create navigation and UI design',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Define offline and permission behavior',
                        weight: 2,
                        priority: WorkItemPriority.MEDIUM,
                    },
                ],
            },
            {
                title: 'Application foundation',
                description: 'Set up app architecture, networking, storage and authentication.',
                weight: 25,
                tasks: [
                    {
                        title: 'Create application architecture',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Implement networking and API integration',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Implement secure authentication',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add local persistence and offline handling',
                        weight: 3,
                        priority: WorkItemPriority.MEDIUM,
                    },
                ],
            },
            {
                title: 'Core mobile features',
                description: 'Build the primary app workflows, notifications and device integrations.',
                weight: 40,
                tasks: [
                    {
                        title: 'Build core user workflows',
                        weight: 6,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add notifications and deep links',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Handle permissions and device states',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Complete device and OS testing',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Release',
                description: 'Prepare store assets, release builds and production monitoring.',
                weight: 20,
                tasks: [
                    {
                        title: 'Prepare signed release build',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Complete store listing and privacy information',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Add crash and performance monitoring',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
        ],
    },

    API: {
        type: DevelopmentTemplateType.API,
        label: 'API product',
        description:
            'An API roadmap covering contracts, security, reliability and release.',
        milestones: [
            {
                title: 'API contract',
                description: 'Define consumers, endpoints, errors, authentication and versioning.',
                weight: 20,
                tasks: [
                    {
                        title: 'Define resources and endpoint contracts',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Define authentication and authorization',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Define error and pagination formats',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Core implementation',
                description: 'Build database, business rules, validation and documentation.',
                weight: 40,
                tasks: [
                    {
                        title: 'Create database schema and migrations',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Implement core endpoint modules',
                        weight: 6,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add validation and authorization',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Generate API documentation',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Reliability and security',
                description: 'Add tests, rate limits, logging, monitoring and abuse protection.',
                weight: 25,
                tasks: [
                    {
                        title: 'Add integration and authorization tests',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add rate limiting and request protection',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Add structured logging and monitoring',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'API launch',
                description: 'Deploy, verify compatibility and publish usage documentation.',
                weight: 15,
                tasks: [
                    {
                        title: 'Deploy production API',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Complete production smoke testing',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Publish client integration guide',
                        weight: 2,
                        priority: WorkItemPriority.MEDIUM,
                    },
                ],
            },
        ],
    },

    ECOMMERCE: {
        type: DevelopmentTemplateType.ECOMMERCE,
        label: 'E-commerce',
        description:
            'An e-commerce roadmap covering catalog, checkout, operations and launch.',
        milestones: [
            {
                title: 'Catalog foundation',
                description: 'Prepare products, categories, pricing, inventory and media.',
                weight: 25,
                tasks: [
                    {
                        title: 'Create product and category management',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Implement variants, pricing and inventory',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add product images and search',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Commerce flow',
                description: 'Build cart, checkout, payment and order lifecycle.',
                weight: 40,
                tasks: [
                    {
                        title: 'Implement cart and checkout',
                        weight: 6,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Integrate payment provider',
                        weight: 6,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Implement order lifecycle',
                        weight: 5,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Add customer notifications',
                        weight: 3,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Operations',
                description: 'Prepare shipping, returns, administration and reporting.',
                weight: 20,
                tasks: [
                    {
                        title: 'Implement shipping and delivery rules',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Implement returns and refunds',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Build order administration',
                        weight: 4,
                        priority: WorkItemPriority.HIGH,
                    },
                ],
            },
            {
                title: 'Launch readiness',
                description: 'Verify security, payments, policies, analytics and production deployment.',
                weight: 15,
                tasks: [
                    {
                        title: 'Complete payment and security testing',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                    {
                        title: 'Publish legal and customer policies',
                        weight: 2,
                        priority: WorkItemPriority.HIGH,
                    },
                    {
                        title: 'Deploy and verify production store',
                        weight: 4,
                        priority: WorkItemPriority.CRITICAL,
                    },
                ],
            },
        ],
    },
};