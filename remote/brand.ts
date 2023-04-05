import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";

import { Log, ENUM_CORP, Corp, Contact } from "qqlx-core";
import { HOST_MID_BRAND, PORT_MID_BRAND, getCorpDto, getCorpRes, getContactDto, getContactRes, chargeRpcResponse } from "qqlx-sdk";

@Injectable()
export class BrandRemote {
    private readonly client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.TCP,
            options: { host: HOST_MID_BRAND, port: PORT_MID_BRAND },
        });
    }

    async getCorp(dto: getCorpDto): Promise<Corp> {
        const res: getCorpRes = await this.client.send("getCorp", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);

        return info;
    }

    async getContact(dto: getContactDto): Promise<Contact[]> {
        const res: getContactRes = await this.client.send("getContact", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);
        return info;
    }
}
