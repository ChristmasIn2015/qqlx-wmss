import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Contact, Order, OrderJoined } from "qqlx-core";

import { OrderDao } from "dao/order";
import { BrandRemote } from "remote/brand";
import { UserRemote } from "remote/user";

@Injectable()
export class OrderService {
    constructor(
        //
        private readonly OrderDao: OrderDao,
        private readonly UserRemote: UserRemote,
        private readonly BrandRemote: BrandRemote
    ) {}

    async setOrderJoined(
        orders: Order[],
        option: {
            joinContact?: boolean;
            joinCreator?: boolean;
            joinManager?: boolean;
            joinAccounter?: boolean;
        }
    ) {
        // 客户
        if (option.joinContact) {
            const contactIds = [...new Set(orders.map((e) => e.contactId))];
            const contacts = await this.BrandRemote.getContact({ contactIds });
            (orders as OrderJoined[]).forEach((o) => {
                o.joinContact = contacts.find((c) => c._id === o.contactId);
            });
        }

        // 关系人
        if (option.joinCreator || option.joinManager || option.joinAccounter) {
            const userIds = [
                ...new Set(orders.map((e) => e.creatorId)),
                ...new Set(orders.map((e) => e.managerId)),
                ...new Set(orders.map((e) => e.accounterId)),
            ];
            const userInfos = await this.UserRemote.getUserInfoList({ userIds });
            (orders as OrderJoined[]).forEach((o) => {
                o.joinCreator = userInfos.find((u) => u.userId === o.creatorId);
                o.joinManager = userInfos.find((u) => u.userId === o.managerId);
                o.joinAccounter = userInfos.find((u) => u.userId === o.accounterId);
            });
        }

        // 关联订单
        const parentIds = [...new Set(orders.map((e) => e._id)), ...new Set(orders.map((e) => e.parentOrderId))];
        const _orders = await this.OrderDao.query({
            $or: [{ _id: { $in: parentIds } }, { parentOrderId: { $in: parentIds } }],
        });

        (orders as OrderJoined[]).forEach((o) => {
            o.joinChildOrder = _orders.filter((e) => e.parentOrderId === o._id);
            o.joinParentOrder = _orders.filter((e) => e._id === o.parentOrderId);
        });
    }
}
