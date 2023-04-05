import { Catch, ExceptionFilter, ArgumentsHost, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";

import { Response as RestResponse } from "qqlx-cdk";
import { ENUM_LOG, MAP_ENUM_ERROR_CODE } from "qqlx-core";
import { UserDTO } from "qqlx-sdk";

import { LogRemote } from "remote/log";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    constructor(
        //
        private readonly LogRemote: LogRemote
    ) {}

    catch(exception, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const request = context.getRequest<Request>();
        const response = context.getResponse<Response>();

        const chain: string = (request.body.UserDTO || request.body.BrandDTO)?.chain || randomUUID();

        // 业务错误
        const isErrorCode = typeof exception === "number";
        if (isErrorCode) {
            const rest: RestResponse<null> = {
                code: exception,
                data: null,
                message: MAP_ENUM_ERROR_CODE.get(exception)?.text || `未知错误：${exception}`,
            };
            this.LogRemote.log(ENUM_LOG.ERROR, request.path, chain, rest); // async
            response.json(rest);
        }
        // 其他错误
        else {
            const rest: RestResponse<null> = {
                code: null,
                data: null,
                message: exception?.message,
            };
            this.LogRemote.log(ENUM_LOG.ERROR, request.path, chain, rest); // async
            response.json(rest);
        }
    }
}
