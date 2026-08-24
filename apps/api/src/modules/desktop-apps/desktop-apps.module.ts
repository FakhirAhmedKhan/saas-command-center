import { DatabaseModule } from '../../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { ConfiguredDesktopAnalysisProvider } from './analysis/desktop-analysis.provider';
import { DesktopAlertsController } from './controllers/desktop-alerts.controller';
import { DesktopAnalysisController } from './controllers/desktop-analysis.controller';
import { DesktopAppsController } from './controllers/desktop-apps.controller';
import { DesktopBuildArtifactsController } from './controllers/desktop-build-artifacts.controller';
import { DesktopBuildsController } from './controllers/desktop-builds.controller';
import { DesktopCrashesController } from './controllers/desktop-crashes.controller';
import { DesktopOverviewController } from './controllers/desktop-overview.controller';
import { DesktopPerformanceController } from './controllers/desktop-performance.controller';
import { DesktopProjectDetectionController } from './controllers/desktop-project-detection.controller';
import { DesktopReleasesController } from './controllers/desktop-releases.controller';
import { DesktopRepositoriesController } from './controllers/desktop-repositories.controller';
import { DesktopSecurityHealthController } from './controllers/desktop-security-health.controller';
import { DesktopRepositoryMetadataService } from './services/desktop-repository-metadata.service';
import { DesktopRuntimeService } from './services/desktop-runtime.service';
import { DesktopSecurityService } from './services/desktop-security.service';
import { DesktopTelemetryProviderRegistryService } from './services/desktop-telemetry-provider-registry.service';
import { DesktopTelemetrySecretService } from './services/desktop-telemetry-secret.service';
import { DesktopTelemetryUrlPolicyService } from './services/desktop-telemetry-url-policy.service';
import { DesktopTelemetryService } from './services/desktop-telemetry.service';
import { NormalizedHttpDesktopTelemetryProvider } from './telemetry/normalized-http-desktop-telemetry.provider';
import { TeamOperationsModule } from '../team-operations/team-operations.module';
import { DesktopSecurityController } from './controllers/desktop-security.controller';
import { DesktopTelemetryController } from './controllers/desktop-telemetry.controller';
import { DesktopTestsController } from './controllers/desktop-tests.controller';
import { DesktopResourceScopeService } from './security/desktop-resource-scope.service';
import { DesktopSecretSanitizerService } from './security/desktop-secret-sanitizer.service';
import { DesktopAlertWorkerService } from './services/desktop-alert-worker.service';
import { DesktopAlertsService } from './services/desktop-alerts.service';
import { DesktopAnalysisContextService } from './services/desktop-analysis-context.service';
import { DesktopAnalysisService } from './services/desktop-analysis.service';
import { DesktopAppsService } from './services/desktop-apps.service';
import { DesktopBuildArtifactsService } from './services/desktop-build-artifacts.service';
import { DesktopBuildsService } from './services/desktop-builds.service';
import { DesktopCrashesService } from './services/desktop-crashes.service';
import { DesktopDependencyHealthService } from './services/desktop-dependency-health.service';
import { DesktopOverviewService } from './services/desktop-overview.service';
import { DesktopPerformanceService } from './services/desktop-performance.service';
import { DesktopPermissionsService } from './services/desktop-permissions.service';
import { DesktopProjectDetectionService } from './services/desktop-project-detection.service';
import { DesktopReleasesService } from './services/desktop-releases.service';
import { DesktopRepositoryService } from './services/desktop-repository.service';
import { DesktopTestsService } from './services/desktop-tests.service';
import { WorkspaceMembersModule } from '../workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule, WorkspaceMembersModule, ActivityModule, RepositoriesModule, TeamOperationsModule],

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
    DesktopAlertsController,
    DesktopAnalysisController,
    DesktopSecurityController,
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
    DesktopAlertsService,
    DesktopAlertWorkerService,
    DesktopAnalysisContextService,
    ConfiguredDesktopAnalysisProvider,
    DesktopAnalysisService,
    DesktopPermissionsService,
    DesktopResourceScopeService,
    DesktopSecretSanitizerService,
  ],

  exports: [
    DesktopAppsService,
    DesktopTelemetryService,
    DesktopPerformanceService,
    DesktopCrashesService,
    DesktopAlertsService,
    DesktopAnalysisService,
    DesktopPermissionsService,
    DesktopDependencyHealthService,
    DesktopSecurityService,
    DesktopRepositoryService,
    DesktopBuildsService,
    DesktopTestsService,
    DesktopReleasesService,
  ],
})
export class DesktopAppsModule {}
