import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";

import { Log, ENUM_LOG } from "qqlx-core";
import { HOST_MID_LOG, PORT_MID_LOG, postLogDto, postLogRes, chargeRpcResponse } from "qqlx-sdk";

@Injectable()
export class LogRemote {
    private readonly client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.TCP,
            options: { host: HOST_MID_LOG, port: PORT_MID_LOG },
        });
    }

    log(option: { type: ENUM_LOG; path: string; chain: string; ip: string; duration: number; json: string }) {
        const dto: postLogDto = { schema: option as Log };
        this.client.emit("postLog", dto).toPromise(); // event async
    }
}
