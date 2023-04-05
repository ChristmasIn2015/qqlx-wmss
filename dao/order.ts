import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { Prop, Schema, SchemaFactory, InjectModel } from "@nestjs/mongoose";

import { ENUM_ORDER, Order as _ } from "qqlx-core";
import { MongooseDao } from "qqlx-sdk";

@Schema()
export class Order implements _ {
    @Prop({ default: "", required: true })
    corpId: string;

    @Prop({ default: "" })
    parentOrderId: string;
    @Prop({
        default: ENUM_ORDER.NONE,
        enum: [
            ENUM_ORDER.NONE,
            ENUM_ORDER.PURCHASE,
            ENUM_ORDER.SALES,
            ENUM_ORDER.MATERIAL,
            ENUM_ORDER.PROCESS,
            ENUM_ORDER.GETIN,
            ENUM_ORDER.GETOUT,
            ENUM_ORDER.TRANSFORM_CUSTOMER,
            ENUM_ORDER.TRANSFORM_MERCHANT,
        ],
    })
    parentOrderType: ENUM_ORDER;

    @Prop({ default: "" })
    creatorId: string;
    @Prop({ default: "" })
    contactId: string;
    @Prop({ default: "" })
    managerId: string;
    @Prop({ default: "" })
    accounterId: string;

    @Prop({
        default: ENUM_ORDER.NONE,
        enum: [
            ENUM_ORDER.NONE,
            ENUM_ORDER.PURCHASE,
            ENUM_ORDER.SALES,
            ENUM_ORDER.MATERIAL,
            ENUM_ORDER.PROCESS,
            ENUM_ORDER.GETIN,
            ENUM_ORDER.GETOUT,
            ENUM_ORDER.TRANSFORM_CUSTOMER,
            ENUM_ORDER.TRANSFORM_MERCHANT,
        ],
    })
    type: ENUM_ORDER;
    @Prop({ default: "" })
    code: string;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amount: number;
    @Prop({ default: "" })
    remark: string;
    @Prop({ default: false })
    isDisabled: boolean;

    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfOrder: number;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfOrderRest: number;

    @Prop({ required: true })
    _id: string;
    @Prop({ default: 0 })
    timeCreate: number;
    @Prop({ default: 0 })
    timeUpdate: number;
    @Prop({ default: "" })
    timeCreateString: string;
    @Prop({ default: "" })
    timeUpdateString: string;
}
export const OrderSchema = SchemaFactory.createForClass(Order).set("versionKey", false);

@Injectable()
export class OrderDao extends MongooseDao<Order> {
    constructor(@InjectModel(Order.name) private model: Model<Order>) {
        super(model);
    }
}
