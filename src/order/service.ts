import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Contact, ENUM_ORDER, Order, OrderJoined, ENUM_BRAND_ROLE } from "qqlx-core";

import { OrderDao } from "dao/order";
import { BrandRemote } from "remote/brand";
import { UserRemote } from "remote/user";
import { MarketRemote } from "remote/market";

@Injectable()
export class OrderService {
    constructor(
        //
        private readonly OrderDao: OrderDao,
        // private readonly UserRemote: UserRemote,
        private readonly BrandRemote: BrandRemote,
        private readonly MarketRemote: MarketRemote
    ) {}

    async getOrderJoined(exits: Order[]): Promise<OrderJoined[]> {
        const contactIds = [...new Set(exits.map((e) => e.contactId))];
        const contacts = await this.BrandRemote.getContact({ contactIds });

        return (exits as OrderJoined[]).map((o) => {
            o.joinContact = contacts.find((c) => c._id === o.contactId);
            return o;
        });
    }

    async chargeOrder(
        corpId: string,
        userId: string,
        option: {
            orderType: ENUM_ORDER;
            parentOrderId: string;
            parentOrderType: ENUM_ORDER;
        }
    ) {
        // *剩余有效期必须足够
        await this.MarketRemote.isCorpEmpower({ corpId });

        // *权限必须足够
        const valid = { userId, corpId };
        if (option.orderType === ENUM_ORDER.SALES) {
            await this.BrandRemote.getMarketRole({ ...valid, role: ENUM_BRAND_ROLE.SALES });
        } else if (option.orderType === ENUM_ORDER.PURCHASE) {
            await this.BrandRemote.getMarketRole({ ...valid, role: ENUM_BRAND_ROLE.PURCHASE });
        } else if ([ENUM_ORDER.GETIN, ENUM_ORDER.GETOUT, ENUM_ORDER.MATERIAL, ENUM_ORDER.PROCESS].includes(option.orderType)) {
            await this.BrandRemote.getMarketRole({ ...valid, role: ENUM_BRAND_ROLE.WM });
        }

        // 最多创建一项关联订单
        if (option.parentOrderId) {
            // 采购1 入库1
            if (option.parentOrderType === ENUM_ORDER.PURCHASE) {
                const existCount = await this.OrderDao.count({ corpId, parentOrderId: option.parentOrderId, type: ENUM_ORDER.GETIN });
                if (existCount > 0) throw new Error(`仓库已卸货，请检查对应入库单`);
            }
            // 销售1 发货1
            else if (option.parentOrderType === ENUM_ORDER.SALES) {
                const existCount = await this.OrderDao.count({ corpId, parentOrderId: option.parentOrderId, type: ENUM_ORDER.GETOUT });
                if (existCount > 0) throw new Error(`仓库已备货，请检查对应发货单`);
            }
            // 无法创建其他类型关联订单
            else {
                throw new Error(`单据错误，已提交技术中心`);
            }
        }
    }
}
