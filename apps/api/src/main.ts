import "reflect-metadata";
import "./configure-env";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./modules/app.module";
import { logger } from "@arete/observability";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false })
  );

  app.enableCors({
    origin: true,
    credentials: true
  });

  app.setGlobalPrefix("api/v1");

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  logger.info({ port }, "Arete API started");
}

bootstrap().catch((error) => {
  logger.error({ error }, "Arete API failed to start");
  process.exit(1);
});
