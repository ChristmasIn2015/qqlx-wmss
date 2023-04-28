import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";

import { Response } from "qqlx-cdk";
import { Log, ENUM_CORP, Corp, Contact, AreaJoined } from "qqlx-core";
import {
    HOST_MID_BRAND,
    PORT_MID_BRAND,
    getCorpDto,
    getCorpRes,
    getMarketRoleDto,
    getMarketRoleRes,
    getContactDto,
    getContactRes,
    chargeRpcResponse,
    getAreaDto,
    getAreaRes,
} from "qqlx-sdk";

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
        const res: Response<Corp> = await this.client.send("getCorp", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);
        return info;
    }

    async getMarketRole(dto: getMarketRoleDto): Promise<null> {
        const res: Response<getMarketRoleRes> = await this.client.send("getMarketRole", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);
        return null;
    }

    async getContact(dto: getContactDto): Promise<Contact[]> {
        const res: getContactRes = await this.client.send("getContact", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);
        return info;
    }

    async getArea(dto: getAreaDto): Promise<AreaJoined[]> {
        const res: getAreaRes = await this.client.send("getArea", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);
        return info;
    }
}
