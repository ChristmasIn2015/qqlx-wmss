import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Contact, ENUM_ORDER, Order, OrderJoined, ENUM_BRAND_ROLE, Sku } from "qqlx-core";

import { OrderDao } from "dao/order";
import { ClueDao } from "dao/clue";
import { SkuService } from "src/sku/service";
import { BrandRemote } from "remote/brand";
import { UserRemote } from "remote/user";
import { MarketRemote } from "remote/market";

@Injectable()
export class OrderService {
    constructor(
        //
        private readonly ClueDao: ClueDao,
        private readonly OrderDao: OrderDao,
        private readonly SkuService: SkuService,
        // private readonly UserRemote: UserRemote,
        private readonly BrandRemote: BrandRemote,
        private readonly MarketRemote: MarketRemote
    ) {}

    async setOrderJoined(exits: Order[], option?: { corpId: string; joinSku?: boolean }) {
        const contactIds = [...new Set(exits.map((e) => e.contactId))];
        const contacts = await this.BrandRemote.getContact({ contactIds });

        const codes = [...new Set(exits.map((e) => e.code))];
        const or = codes.map((code) => ({ corpId: option?.corpId, content: new RegExp(`打印了销售单 ${code}`) }));
        const clues = or.length > 0 ? await this.ClueDao.query({ $or: or }) : [];

        const skus: Sku[] = [];
        if (option?.joinSku) {
            const calcu = await this.SkuService.getSkuCalculation({
                corpId: option?.corpId,
                orderId: { $in: exits.map((e) => e._id) },
            });
            skus.push(...calcu.list);
        }

        for (const order of exits) {
            const _order = order as OrderJoined;
            _order.joinContact = contacts.find((c) => c._id === _order.contactId);
            _order.joinSku = skus.filter((e) => e.orderId === _order._id);
            if (order.type === ENUM_ORDER.SALES) {
                const count = clues.filter((clue) => clue.content.includes(_order.code)).length;
                if (count > 0) _order.joinCluePrint = `${count}次`;
            }
        }
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
            const parentOrderId = option.parentOrderId;
            // 采购1 入库1
            if (option.parentOrderType === ENUM_ORDER.PURCHASE) {
                const existCount = await this.OrderDao.count({ corpId, parentOrderId, isDisabled: false, type: ENUM_ORDER.GETIN });
                if (existCount > 0) throw new Error(`检测到入库单`);
            }
            // 销售1 发货1
            else if (option.parentOrderType === ENUM_ORDER.SALES) {
                const existCount = await this.OrderDao.count({ corpId, parentOrderId, isDisabled: false, type: ENUM_ORDER.GETOUT });
                if (existCount > 0) throw new Error(`检测到出库单`);
            }
            // 加工1 领料1
            else if (option.parentOrderType === ENUM_ORDER.MATERIAL) {
                const existCount = await this.OrderDao.count({ corpId, parentOrderId, isDisabled: false, type: ENUM_ORDER.PROCESS });
                if (existCount > 0) throw new Error(`检测到加工单`);
            }
            // 无法创建其他类型关联订单
            else {
                throw new Error(`单据错误，已提交技术中心`);
            }
        }
    }
}
