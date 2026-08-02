import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller('version')
export class VersionController {
  @Get()
  @ApiOperation({ summary: 'Read API version information' })
  @ApiOkResponse({ description: 'API version information.' })
  getVersion() {
    return {
      name: 'command-center-api',
      version: process.env.npm_package_version ?? '0.1.0',
      node: process.version,
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
