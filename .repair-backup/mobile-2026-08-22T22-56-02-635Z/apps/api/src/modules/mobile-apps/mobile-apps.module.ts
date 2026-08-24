import { DatabaseModule } from '../../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { ConfiguredMobileAnalysisProvider } from './analysis/mobile-analysis.provider';
import { MobileAlertsController } from './controllers/mobile-alerts.controller';
import { MobileAppsController } from './controllers/mobile-apps.controller';
import { MobileBuildsController } from './controllers/mobile-builds.controller';
import { MobileOverviewController } from './controllers/mobile-overview.controller';
import { MobilePerformanceDashboardController } from './controllers/mobile-performance-dashboard.controller';
import { MobileProjectDetectionController } from './controllers/mobile-project-detection.controller';
import { MobileReleasesController } from './controllers/mobile-releases.controller';
import { MobileRepositoriesController } from './controllers/mobile-repositories.controller';
import { MobileTelemetryController } from './controllers/mobile-telemetry.controller';
import { MobileTestsController } from './controllers/mobile-tests.controller';
import { MobileAppsService } from './services/mobile-apps.service';
import { MobileOverviewService } from './services/mobile-overview.service';
import { MobileProjectDetectionService } from './services/mobile-project-detection.service';
import { MobileRepositoryService } from './services/mobile-repository.service';
import { MobileTestsService } from './services/mobile-tests.service';
import { MobileReleasesService } from './services/mobile-releases.service';
import { MobileTelemetryService } from './services/mobile-telemetry.service';
import { MobileTelemetryProviderRegistry } from './telemetry/mobile-telemetry-provider.registry';
import { MobileTelemetrySecretService } from './telemetry/mobile-telemetry-secret.service';
import { TeamOperationsModule } from '../team-operations/team-operations.module';
import { MobileSecurityController } from './controllers/mobile-security.controller';
import { MobileAlertsService } from './services/mobile-alerts.service';
import { MobileAnalysisContextService } from './services/mobile-analysis-context.service';
import { MobileAnalysisService } from './services/mobile-analysis.service';
import { MobilePerformanceDashboardService } from './services/mobile-performance-dashboard.service';
import { MobilePermissionsService } from './security/mobile-permissions.service';
import { MobileProviderSecurityService } from './security/mobile-provider-security.service';
import { MobileSecretSanitizerService } from './security/mobile-secret-sanitizer.service';
import { MobileAlertWorkerService } from './services/mobile-alert-worker.service';
import { MobileResourceScopeService } from './services/mobile-resource-scope.service';
import { ProviderHttpService } from './telemetry/provider-http.service';
import { WorkspaceMembersModule } from '../workspace/modules/workspace-members.module';
import { CustomMobileTelemetryProvider } from './telemetry/providers/custom-mobile-telemetry.provider';
import { DatadogMobileTelemetryProvider } from './telemetry/providers/datadog-mobile-telemetry.provider';
import { FirebaseMobileTelemetryProvider } from './telemetry/providers/firebase-mobile-telemetry.provider';
import { NewRelicMobileTelemetryProvider } from './telemetry/providers/new-relic-mobile-telemetry.provider';
import { SentryMobileTelemetryProvider } from './telemetry/providers/sentry-mobile-telemetry.provider';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule, WorkspaceMembersModule, ActivityModule, RepositoriesModule, TeamOperationsModule],

  controllers: [
    MobileAppsController,
    MobileOverviewController,
    MobileRepositoriesController,
    MobileProjectDetectionController,
    MobileBuildsController,
    MobileTestsController,
    MobileReleasesController,
    MobileTelemetryController,
    MobilePerformanceDashboardController,
    MobileAlertsController,
    MobileAnalysisController,

    MobileSecurityController,
  ],

  providers: [
    MobileAppsService,
    MobileOverviewService,

    MobileRepositoryService,
    MobileProjectDetectionService,

    MobileBuildsService,
    MobileTestsService,
    MobileReleasesService,

    MobileTelemetryService,
    MobileTelemetryProviderRegistry,
    MobileTelemetrySecretService,

    MobilePerformanceQueryRepository,
    MobilePerformanceDashboardService,

    MobileAlertsService,
    MobileAlertWorkerService,

    MobileAnalysisContextService,
    ConfiguredMobileAnalysisProvider,
    MobileAnalysisService,

    MobileResourceScopeService,
    MobilePermissionsService,
    MobileProviderSecurityService,
    MobileSecretSanitizerService,

    ProviderHttpService,

    FirebaseMobileTelemetryProvider,
    SentryMobileTelemetryProvider,
    DatadogMobileTelemetryProvider,
    NewRelicMobileTelemetryProvider,
    CustomMobileTelemetryProvider,
  ],

  exports: [MobileAppsService, MobileOverviewService, MobileRepositoryService, MobileProjectDetectionService, MobileBuildsService, MobileTestsService, MobileReleasesService, MobileTelemetryService],
})
export class MobileAppsModule {}
