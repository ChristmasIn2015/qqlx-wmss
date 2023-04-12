import { Injectable, NestInterceptor, CallHandler, ExecutionContext } from "@nestjs/common";
import { map } from "rxjs/operators";
import { randomUUID } from "crypto";

import { Response } from "qqlx-cdk";
import { ENUM_LOG, MAP_ENUM_ERROR_CODE } from "qqlx-core";
import { UserDTO } from "qqlx-sdk";

import { LogRemote } from "remote/log";

@Injectable()
export class GlobalResponseInterceptor<T> implements NestInterceptor {
    constructor(
        //
        private readonly LogRemote: LogRemote
    ) {}

    intercept(context: ExecutionContext, next: CallHandler) {
        const request = context.switchToHttp().getRequest();
        const path = request.path;

        const chain: string = (request.body.UserDTO || request.body.BrandDTO)?.chain || randomUUID();
        this.LogRemote.log(ENUM_LOG.TRACE, path, chain); // async
        const start = Date.now();

        return next.handle().pipe(
            map((data) => {
                const response: Response<T> = {
                    code: 200,
                    data: data ?? null,
                    message: "成功",
                };
                this.LogRemote.log(ENUM_LOG.ALL, path, chain, { time: Date.now() - start }); // async
                return response;
            })
        );
    }
}
