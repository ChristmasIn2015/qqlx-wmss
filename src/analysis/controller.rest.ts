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
        // 最多查询40天
        if (Math.abs(dto.endTime - dto.startTime) > 86400000 * 40) throw new Error(`最多查询40天`);

        // 搜索
        const match = {
            corpId: BrandDTO.corp?._id,
            type: dto.type,
            isDisabled: false,
            timeCreate: {
                $gte: dto?.startTime || 0,
                $lte: dto?.endTime || Date.now(),
            },
            ...(dto.contactId && { contactId: dto.contactId }),
        };

        // Group查询
        const aggre: { _id: string; count: number; amount: number; amountBookOfOrder: number; amountBookOfOrderRest: number }[] = await this.OrderDao.aggregate(
            [
                { $match: match },
                {
                    $group: {
                        _id: "$contactId",
                        count: { $sum: 1 },
                        amount: { $sum: "$amount" },
                        amountBookOfOrder: { $sum: "$amountBookOfOrder" },
                        amountBookOfOrderRest: { $sum: "$amountBookOfOrderRest" },
                    },
                },
                { $sort: { [dto.sortKey]: dto.sortValue } },
            ]
        );

        // Join
        const contactIds = aggre.map((e) => e._id);
        const contacts = await this.BrandRemote.getContact({ contactIds });
        const result: getContactAnalysisRes = aggre.map((e) => {
            return {
                type: dto.type,
                contactId: e._id,
                joinContact: contacts.find((con) => con._id === e._id),
                count: e.count,
                amount: e.amount / 100,
                amountBookOfOrder: e.amountBookOfOrder / 100,
                amountBookOfOrderRest: e.amountBookOfOrderRest / 100,
            };
        });

        return result;
    }
}
