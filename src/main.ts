import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppModule } from "./app.module";

import { PORT_REST_WMSS, HOST_MID_WMSS, PORT_MID_WMSS } from "qqlx-sdk";

import { GlobalExceptionFilter } from "global/exception.filter";
import { GlobalResponseInterceptor } from "global/response.interceptor";
import { LogRemote } from "remote/log";

async function bootstrap() {
    // 创建基于 TCP 协议的微服务
    // const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    //     transport: Transport.TCP,
    //     options: { host: HOST_MID_WMSS, port: PORT_MID_WMSS },
    // });
    // await microservice.listen();

    // 启动 RESTful API
    const app = await NestFactory.create(AppModule);
    app.useGlobalFilters(new GlobalExceptionFilter(new LogRemote()));
    app.useGlobalInterceptors(new GlobalResponseInterceptor(new LogRemote()));
    await app.listen(PORT_REST_WMSS);
}
bootstrap();
