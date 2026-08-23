import { DatabaseModule } from '../../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WorkspaceMembersModule } from '../workspace/modules/workspace-members.module';
import { DesktopAppsController } from './controllers/desktop-apps.controller';
import { DesktopBuildArtifactsController } from './controllers/desktop-build-artifacts.controller';
import { DesktopBuildsController } from './controllers/desktop-builds.controller';
import { DesktopOverviewController } from './controllers/desktop-overview.controller';
import { DesktopProjectDetectionController } from './controllers/desktop-project-detection.controller';
import { DesktopRepositoriesController } from './controllers/desktop-repositories.controller';
import { DesktopTestsController } from './controllers/desktop-tests.controller';
import { DesktopAppsService } from './services/desktop-apps.service';
import { DesktopBuildArtifactsService } from './services/desktop-build-artifacts.service';
import { DesktopBuildsService } from './services/desktop-builds.service';
import { DesktopOverviewService } from './services/desktop-overview.service';
import { DesktopProjectDetectionService } from './services/desktop-project-detection.service';
import { DesktopRepositoryService } from './services/desktop-repository.service';
import { Module } from '@nestjs/common';
import { DesktopTestsService } from './services/desktop-tests.service';
import { DesktopReleasesController } from './controllers/desktop-releases.controller';
import { DesktopReleasesService } from './services/desktop-releases.service';
import { DesktopCrashesController } from './controllers/desktop-crashes.controller';
import { DesktopPerformanceController } from './controllers/desktop-performance.controller';
import { DesktopSecurityHealthController } from './controllers/desktop-security-health.controller';
import { DesktopTelemetryController } from './controllers/desktop-telemetry.controller';
import { DesktopCrashesService } from './services/desktop-crashes.service';
import { DesktopDependencyHealthService } from './services/desktop-dependency-health.service';
import { DesktopPerformanceService } from './services/desktop-performance.service';
import { DesktopRepositoryMetadataService } from './services/desktop-repository-metadata.service';
import { DesktopRuntimeService } from './services/desktop-runtime.service';
import { DesktopSecurityService } from './services/desktop-security.service';
import { DesktopTelemetryProviderRegistryService } from './services/desktop-telemetry-provider-registry.service';
import { DesktopTelemetrySecretService } from './services/desktop-telemetry-secret.service';
import { DesktopTelemetryUrlPolicyService } from './services/desktop-telemetry-url-policy.service';
import { DesktopTelemetryService } from './services/desktop-telemetry.service';
import { NormalizedHttpDesktopTelemetryProvider } from './telemetry/normalized-http-desktop-telemetry.provider';

@Module({
    imports: [DatabaseModule, WorkspaceMembersModule, ActivityModule, RepositoriesModule],

    controllers: [
        DesktopTelemetryController,
        DesktopPerformanceController,
        DesktopCrashesController,
        DesktopSecurityHealthController,
        DesktopAppsController,
        DesktopRepositoriesController,
        DesktopProjectDetectionController,
        DesktopOverviewController,
        DesktopBuildsController,
        DesktopBuildArtifactsController,
        DesktopTestsController,
        DesktopReleasesController,
    ],

    providers: [
        DesktopTelemetrySecretService,
        DesktopTelemetryUrlPolicyService,
        NormalizedHttpDesktopTelemetryProvider,
        DesktopTelemetryProviderRegistryService,
        DesktopTelemetryService,
        DesktopRuntimeService,
        DesktopPerformanceService,
        DesktopCrashesService,
        DesktopRepositoryMetadataService,
        DesktopDependencyHealthService,
        DesktopSecurityService,
        DesktopAppsService,
        DesktopRepositoryService,
        DesktopProjectDetectionService,
        DesktopBuildsService,
        DesktopBuildArtifactsService,
        DesktopTestsService,
        DesktopReleasesService,
        DesktopOverviewService,
    ],

    exports: [DesktopAppsService, DesktopTelemetryService,
        DesktopPerformanceService,
        DesktopCrashesService,
        DesktopDependencyHealthService,
        DesktopSecurityService, , DesktopRepositoryService, DesktopBuildsService, DesktopTestsService, DesktopReleasesService],
})
export class DesktopAppsModule { }
