import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import {
    PassportModule,
} from '@nestjs/passport';
import { WorkspacesModule } from 'src/modules/workspace/modules/workspaces.module';
import { AuthController } from '../controllers/auth.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AuthSessionsModule } from './auth-sessions.module';
import { UsersModule } from 'src/modules/users/users.module';


@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt',
        }),
        JwtModule.register({}),
        UsersModule,
        WorkspacesModule,
        AuthSessionsModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        PasswordService,
        TokenService,
        JwtStrategy,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
    exports: [
        AuthService,
        TokenService,
    ],
})
export class AuthModule { }