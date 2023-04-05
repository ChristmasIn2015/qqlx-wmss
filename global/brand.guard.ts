import { randomUUID } from "crypto";

import { CanActivate, Injectable, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { Corp, UserInfo, ENUM_BRAND_ROLE } from "qqlx-core";
import { BrandDTO, getCorpDto } from "qqlx-sdk";

import { UserRemote } from "remote/user";
import { BrandRemote } from "remote/brand";

@Injectable()
export class BrandGuard implements CanActivate {
    constructor(
        //
        private readonly reflector: Reflector,
        private readonly UserRemote: UserRemote,
        private readonly BrandRemote: BrandRemote
    ) {}

    async canActivate(context: ExecutionContext) {
        const request: Request = context.switchToHttp().getRequest();

        const authorization = request.header("Authorization");
        const userInfo = await this.UserRemote.getUserInfo({ jwtString: authorization });

        const corpId = request.header("qqlx-corp-id");
        const demands: ENUM_BRAND_ROLE[] = this.reflector.get("BrandRole", context.getHandler());
        const dto: getCorpDto = { corpId, userId: userInfo.userId, demands: demands };
        dto.demands = demands;
        const corp: Corp = await this.BrandRemote.getCorp(dto);

        const BrandDTO: BrandDTO = { chain: randomUUID(), userInfo, corp };
        request.body.BrandDTO = BrandDTO;
        return true;
    }
}

/** 包含访客 和实习生 */
export const ENUM_BRAND_ROLE_ALL = [
    ENUM_BRAND_ROLE.ROOT,
    ENUM_BRAND_ROLE.TRAINEE,
    ENUM_BRAND_ROLE.PURCHASE,
    ENUM_BRAND_ROLE.SALES,
    ENUM_BRAND_ROLE.WM,
    ENUM_BRAND_ROLE.FINANCE,
    ENUM_BRAND_ROLE.ENTERTAIN,
    ENUM_BRAND_ROLE.VISITOR,
];

/** 不包含访客 和实习生 */
export const ENUM_BRAND_ROLE_CORE = [
    ENUM_BRAND_ROLE.ROOT,
    ENUM_BRAND_ROLE.PURCHASE,
    ENUM_BRAND_ROLE.SALES,
    ENUM_BRAND_ROLE.WM,
    ENUM_BRAND_ROLE.FINANCE,
    ENUM_BRAND_ROLE.ENTERTAIN,
];

/** 不包含财务、访客 和实习生 */
export const ENUM_BRAND_ROLE_NORMAL = [
    //
    ENUM_BRAND_ROLE.ROOT,
    ENUM_BRAND_ROLE.PURCHASE,
    ENUM_BRAND_ROLE.SALES,
    ENUM_BRAND_ROLE.WM,
];
