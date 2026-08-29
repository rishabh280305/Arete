import { Body, Controller, Get, Post, Req, UnauthorizedException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { clerkSessionSchema } from "@arete/validation";
import { getAuthContext } from "../../common/auth-context";
import { parseBody } from "../../common/parse-body";
import { AuthService } from "./auth.service";

type LoginBody = {
  email: string;
  password: string;
};

@Controller("auth")
export class AuthController {
  private readonly authService = new AuthService();

  @Post("dev/seed")
  async seedDemoData() {
    try {
      return await this.authService.seedDemoData();
    } catch {
      return this.authService.seedFallbackData();
    }
  }

  @Post("login")
  async login(@Body() body: LoginBody) {
    let result = await this.authService.fallbackLogin(body);
    try {
      result = (await this.authService.login(body)) ?? result;
    } catch {
      result = await this.authService.fallbackLogin(body);
    }
    if (!result) {
      throw new UnauthorizedException("Invalid email, password, school, or role");
    }

    return result;
  }

  @Post("clerk/session")
  async clerkSession(
    @Req() request: FastifyRequest,
    @Body() body: { email: string; displayName: string; role: string; schoolSlug?: string }
  ) {
    const configuredSecret = process.env.INTERNAL_API_SECRET;
    const rawSecret = request.headers["x-arete-internal-secret"];
    const suppliedSecret = Array.isArray(rawSecret) ? rawSecret[0] : rawSecret;
    if (configuredSecret && suppliedSecret !== configuredSecret) {
      throw new UnauthorizedException("Invalid internal API secret");
    }

    const input = parseBody(clerkSessionSchema, body);
    let result = await this.authService.fallbackClerkLogin(input);
    try {
      result = (await this.authService.clerkLogin(input)) ?? result;
    } catch {
      result = await this.authService.fallbackClerkLogin(input);
    }
    if (!result) {
      throw new UnauthorizedException("Could not create session");
    }
    return result;
  }

  @Get("me")
  async me(@Req() request: FastifyRequest) {
    const context = await getAuthContext(request);
    try {
      return await this.authService.me(context);
    } catch {
      return this.authService.fallbackMe(context);
    }
  }
}
