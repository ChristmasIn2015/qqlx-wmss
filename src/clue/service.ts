import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Clue, ENUM_PROJECT, Order } from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { ClueDao } from "dao/clue";
import { OrderDao } from "dao/order";
import { BrandRemote } from "remote/brand";

@Injectable()
export class ClueService {
    constructor(
        //
        private readonly BrandRemote: BrandRemote,
        private readonly ClueDao: ClueDao,
        private readonly OrderDao: OrderDao
    ) {}

    async insertOrderCreation(BrandDTO: BrandDTO, order: Order) {
        order = await this.OrderDao.findOne(order?._id);
        if (!order) throw new Error("操作记录异常，请重新试试");

        const contacts = await this.BrandRemote.getContact({ contactIds: [order.contactId] });
        const contact = contacts[0];

        const schema: Clue = this.ClueDao.getSchema();
        schema.corpId = BrandDTO.corp?._id;
        schema.scope = ENUM_PROJECT.KDBGS;
        schema.content = `${BrandDTO.userInfo?.nickname}: 创建了销售单 ${order.code}`;
        schema.content += `，客户为 ${contact?.name || "客户异常"}`;
        schema.content += `，金额 ${(order.amount / 100).toFixed(2)} 元`;
        await this.ClueDao.create(schema);
    }

    async insertOrderEdition(BrandDTO: BrandDTO, order: Order) {
        order = await this.OrderDao.findOne(order?._id);
        if (!order) throw new Error("操作记录异常，请重新试试");

        const contacts = await this.BrandRemote.getContact({ contactIds: [order.contactId] });
        const contact = contacts[0];

        const schema: Clue = this.ClueDao.getSchema();
        schema.corpId = BrandDTO.corp?._id;
        schema.scope = ENUM_PROJECT.KDBGS;
        schema.content = `${BrandDTO.userInfo?.nickname}: 修改了销售单 ${order.code}`;
        schema.content += `，客户为 ${contact?.name || "客户异常"}`;
        schema.content += `，修改后金额为 ${(order.amount / 100).toFixed(2)} 元`;
        await this.ClueDao.create(schema);
    }

    async insertOrderPrint(BrandDTO: BrandDTO, order: Order) {
        order = await this.OrderDao.findOne(order?._id);
        if (!order) throw new Error("操作记录异常，请重新试试");

        const contacts = await this.BrandRemote.getContact({ contactIds: [order.contactId] });
        const contact = contacts[0];

        const schema: Clue = this.ClueDao.getSchema();
        schema.corpId = BrandDTO.corp?._id;
        schema.scope = ENUM_PROJECT.KDBGS;
        schema.content = `${BrandDTO.userInfo?.nickname}: 打印了销售单 ${order.code}`;
        schema.content += `，客户为 ${contact?.name || "客户异常"}`;
        schema.content += `，金额 ${(order.amount / 100).toFixed(2)} 元`;
        await this.ClueDao.create(schema);
    }
}
