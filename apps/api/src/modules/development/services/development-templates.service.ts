import { ApplyDevelopmentTemplateDto } from '../dto/development.dto';
import { DEVELOPMENT_TEMPLATES } from '../templates/development-templates';
import { DevelopmentSharedService } from './development-shared.service';
import { DevelopmentSummaryService } from './development-summary.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ActivityEntityType, ApplicationActivityType } from 'src/generated/prisma/enums';

@Injectable()
export class DevelopmentTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly shared: DevelopmentSharedService,
    private readonly summary: DevelopmentSummaryService,
  ) {}

  getTemplates() {
    return Object.values(DEVELOPMENT_TEMPLATES).map((template) => ({
      type: template.type,
      label: template.label,
      description: template.description,
      milestoneCount: template.milestones.length,
      taskCount: template.milestones.reduce((total, milestone) => total + milestone.tasks.length, 0),
    }));
  }

  async applyTemplate(workspaceId: string, applicationId: string, dto: ApplyDevelopmentTemplateDto, actorUserId: string) {
    const template = DEVELOPMENT_TEMPLATES[dto.template];

    if (!template) {
      throw new BadRequestException('Development template not found');
    }

    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const existingMilestones = await transaction.applicationMilestone.count({
        where: {
          applicationId,
        },
      });

      if (existingMilestones > 0 && !dto.replaceExisting) {
        throw new ConflictException('This application already has milestones. Set replaceExisting to true to replace them.');
      }

      if (existingMilestones > 0 && dto.replaceExisting) {
        await transaction.applicationBlocker.deleteMany({
          where: {
            applicationId,
          },
        });

        await transaction.applicationMilestone.deleteMany({
          where: {
            applicationId,
          },
        });
      }

      for (let milestoneIndex = 0; milestoneIndex < template.milestones.length; milestoneIndex += 1) {
        const definition = template.milestones[milestoneIndex];

        const milestone = await transaction.applicationMilestone.create({
          data: {
            applicationId,
            title: definition!.title,
            description: definition!.description,
            weight: definition!.weight,
            position: milestoneIndex,
          },
        });

        if (definition!.tasks.length > 0) {
          await transaction.applicationTask.createMany({
            data: definition!.tasks.map((task, taskIndex) => ({
              milestoneId: milestone.id,
              title: task.title,
              description: task.description ?? null,
              weight: task.weight,
              priority: task.priority,
              position: taskIndex,
            })),
          });
        }
      }

      await transaction.saasApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          developmentTemplate: dto.template,
          templateAppliedAt: new Date(),
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.DEVELOPMENT_TEMPLATE_APPLIED,
        entityType: ActivityEntityType.APPLICATION,
        entityId: applicationId,
        title: 'Development template applied',
        description: `${template.label} was applied to ${application.name}.`,
        metadata: {
          template: dto.template,
          replacedExisting: Boolean(dto.replaceExisting && existingMilestones > 0),
          milestoneCount: template.milestones.length,
        },
      });

      return this.summary.getSummaryWithClient(transaction, workspaceId, applicationId);
    });
  }
}
