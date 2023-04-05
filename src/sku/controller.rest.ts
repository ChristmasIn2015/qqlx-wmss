import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { Page, PageRes, trimObject } from "qqlx-cdk";
import {
    PATH_SKU,
    ENUM_ORDER,
    ENUM_LAYOUT_CABINET,
    getSkuDto,
    getSkuRes,
    patchSkuDto,
    patchSkuRes,
    Sku,
    SkuJoined,
    getSkuByOrderDto,
    getSkuByOrderRes,
} from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL, ENUM_BRAND_ROLE_NORMAL } from "global/brand.guard";
import { SkuDao } from "../../dao/sku";
import { SkuService } from "./service";

@Controller(PATH_SKU)
@UseGuards(BrandGuard)
export class SkuController {
    constructor(
        //
        private readonly SkuDao: SkuDao,
        private readonly SkuService: SkuService
    ) {}

    @Post("/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getSku(@Body("dto") dto: getSkuDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getSkuRes> {
        const search = dto.search;
        trimObject(search);

        // 查询
        const base = {
            corpId: BrandDTO.corp._id,
            orderIsDisabled: false,
            isConfirmed: search.isConfirmed,
        };
        const query = {
            ...base,
            ...(search.name && { name: new RegExp(search.name) }),
            ...(search.norm && { norm: new RegExp(search.norm.replace(/\*/g, "\\*").replace(/\./g, "\\.")) }),
            ...(search.remark && { remark: new RegExp(search.remark) }),
            ...(search.keyOrigin && { keyOrigin: new RegExp(search.keyOrigin) }),
            ...(search.keyFeat && { keyFeat: new RegExp(search.keyFeat) }),
            ...(search.keyCode && { keyCode: new RegExp(search.keyCode) }),
            ...(search.orderContactId && { orderContactId: search.orderContactId }),
        };

        // 大件商品，已入库库存
        // if (dto.isIndividual) {
        //     query["type"] = [ENUM_ORDER.GETIN, ENUM_ORDER.PROCESS];
        //     query["layout"] = ENUM_LAYOUT_CABINET.INDIVIDUAL;
        //     query["isConfirmed"] = true;
        // } else {
        //     query["type"] = { $in: [ENUM_ORDER.GETIN, ENUM_ORDER.GETOUT, ENUM_ORDER.MATERIAL, ENUM_ORDER.PROCESS] };
        //     // query["layout"] = ENUM_LAYOUT_CABINET.SUMMARY;
        // }

        // 排序
        const option = {
            sortKey: dto.sortKey,
            sortValue: dto.sortValue,
            groupKey: dto.groupKey,
        };

        const page = (await this.SkuDao.page(query, dto.page, option)) as PageRes<SkuJoined>;
        page.list = await this.SkuService.getSkuJoined(
            page.list.map((e) => e._id),
            dto.sortKey,
            dto.sortValue
        );

        return page;
    }

    @Post("/byOrder/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getSkuByOrder(@Body("dto") dto: getSkuByOrderDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getSkuByOrderRes> {
        const { orderId } = dto;

        // 查询
        const skus = await this.SkuDao.query({ orderId, corpId: BrandDTO.corp._id });
        const SkuJoineds = await this.SkuService.getSkuJoined(skus.map((e) => e._id));

        return SkuJoineds;
    }

    @Patch()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_NORMAL)
    async patchSku(@Body("dto") dto: patchSkuDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<patchSkuRes> {
        let exist = await this.SkuDao.findOne(dto.entity?._id);
        if (!exist) throw new Error(`找不到商品`);

        if (dto.entity.deductionSkuId) {
            exist = await this.SkuDao.updateOne(exist._id, { deductionSkuId: dto.entity.deductionSkuId });
        }

        if (exist.isConfirmed) {
            await this.SkuService.skuConfirmCancel(exist);
        } else {
            await this.SkuService.skuConfirm(exist);
        }

        return null;
    }
}
