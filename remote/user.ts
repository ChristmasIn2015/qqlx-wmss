import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";

import { UserInfo } from "qqlx-core";
import { HOST_MID_USER, PORT_MID_USER, getUserInfoDto, getUserInfoRes, getUserInfoListDto, getUserInfoListRes, chargeRpcResponse } from "qqlx-sdk";

@Injectable()
export class UserRemote {
    private readonly client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.TCP,
            options: { host: HOST_MID_USER, port: PORT_MID_USER },
        });
    }

    async getUserInfo(dto: getUserInfoDto): Promise<UserInfo> {
        const res: getUserInfoRes = await this.client.send("getUserInfo", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);
        return info;
    }

    async getUserInfoList(dto: getUserInfoListDto): Promise<UserInfo[]> {
        const res: getUserInfoListRes = await this.client.send("getUserInfoList", dto).toPromise(); // event async
        const info = chargeRpcResponse(res);
        return info;
    }
}
