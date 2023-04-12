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
            isConfirmed: search.isConfirmed ? true : { $in: [true, false] },
            type: { $in: dto.types },
            layout:
                search.layout === ENUM_LAYOUT_CABINET.INDIVIDUAL
                    ? ENUM_LAYOUT_CABINET.INDIVIDUAL
                    : { $in: [ENUM_LAYOUT_CABINET.INDIVIDUAL, ENUM_LAYOUT_CABINET.SUMMARY] },
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

        // View
        page.list.forEach((sku) => {
            sku.pounds /= 1000;
            sku.poundsFinal /= 1000;
            sku.price /= 100;
        });
        return page;
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
