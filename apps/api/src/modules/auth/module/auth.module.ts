import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import {
    PassportModule,
} from '@nestjs/passport';
import { AuthController } from '../controllers/auth.controller';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';
import { PasswordService } from '../services/password.service';
import { TokenService } from '../services/token.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AuthSessionsModule } from './auth-sessions.module';
import { UsersModule } from 'src/modules/users/users.module';
import { WorkspaceModule } from 'src/modules/workspace/modules/workspaces.module';
import { AuthCookieService } from '../services/auth-cookie.service';


@Module({
    imports: [
        PassportModule.register({
            defaultStrategy: 'jwt',
        }),
        JwtModule.register({}),
        UsersModule,
        WorkspaceModule,
        AuthSessionsModule,
        AuthCookieService,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        PasswordService,
        TokenService,
        JwtStrategy,
        AuthCookieService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
    exports: [
        AuthCookieService,
        AuthService,
        TokenService,
    ],
})
export class AuthModule { }