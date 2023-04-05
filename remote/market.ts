import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";

import { Log, ENUM_CORP, Corp } from "qqlx-core";
import { HOST_MID_MARKET, PORT_MID_MARKET, isCorpEmpowerDto, isCorpEmpowerRes, chargeRpcResponse } from "qqlx-sdk";

@Injectable()
export class MarketRemote {
    private readonly client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.TCP,
            options: { host: HOST_MID_MARKET, port: PORT_MID_MARKET },
        });
    }

    async isCorpEmpower(dto: isCorpEmpowerDto) {
        const res: isCorpEmpowerRes = await this.client.send("isCorpEmpower", dto).toPromise(); // event async
        chargeRpcResponse(res);
    }
}
