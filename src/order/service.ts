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
        // private readonly OrderDao: OrderDao,
        // private readonly UserRemote: UserRemote,
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
    }
}
