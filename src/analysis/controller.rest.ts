import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { trimObject } from "qqlx-cdk";
import {
    ENUM_ORDER,
    PATH_ORDER_ANALYSIS,
    PATH_CONTACT_ANALYSIS,
    OrderAnalysis,
    getOrderAnalysisDto,
    getOrderAnalysisRes,
    getContactAnalysisDto,
    getContactAnalysisRes,
    ContactAnalysisJoined,
} from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL } from "global/brand.guard";
import { OrderDao } from "dao/order";
import { ContactAnalysisDao } from "dao/analysis";
import { BrandRemote } from "remote/brand";

@Controller()
@UseGuards(BrandGuard)
export class AnalysisController {
    constructor(
        private readonly BrandRemote: BrandRemote,
        //
        private readonly OrderDao: OrderDao,
        private readonly ContactAnalysisDao: ContactAnalysisDao
    ) {}

    @Post(PATH_ORDER_ANALYSIS + "/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getOrderAnalysis(@Body("dto") dto: getOrderAnalysisDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getOrderAnalysisRes> {
        const analysis = dto;

        const match = {
            corpId: BrandDTO.corp._id,
            type: analysis.type,
            isDisabled: false,
            timeCreate: { $gte: analysis.startTime || 0, $lte: analysis.endTime || Date.now() },
        };
        const group = await this.OrderDao.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "_id",
                    count: { $sum: 1 },
                    amount: { $sum: "$amount" },
                    amountBookOfOrder: { $sum: "$amountBookOfOrder" },
                    amountBookOfOrderVAT: { $sum: "$amountBookOfOrderVAT" },
                },
            },
        ]);

        analysis.analysis = {
            count: group[0]?.count ?? 0,
            amount: (group[0]?.amount ?? 0) / 100,
            amountBookOfOrder: (group[0]?.amountBookOfOrder ?? 0) / 100,
            amountBookOfOrderVAT: (group[0]?.amountBookOfOrderVAT ?? 0) / 100,
        };
        return analysis;
    }

    @Post(PATH_CONTACT_ANALYSIS + "/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getContactAnalysis(@Body("dto") dto: getContactAnalysisDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getContactAnalysisRes> {
        // 搜索
        const search = {
            corpId: BrandDTO.corp?._id,
            ...(dto.search?.contactId && { contactId: dto.search.contactId }),
        };

        // 排序
        const option = {
            sortKey: dto.sortKey,
            sortValue: dto.sortValue,
            groupKey: "amount",
        };

        // 正常查询
        const page = await this.ContactAnalysisDao.page(search, dto.page, option);
        const contacts = await this.BrandRemote.getContact({ contactIds: page.list.map((e) => e.contactId) });
        (page.list as ContactAnalysisJoined[]).forEach((e) => {
            e.joinContact = contacts.find((ee) => ee._id === e.contactId);
            // 金额换算
            e.amountOrder /= 100;
            e.amountBookOfOrder /= 100;
            e.amountBookOfOrderRest /= 100;
        });

        return page;
    }
}
