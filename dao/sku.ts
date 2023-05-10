import { Injectable } from "@nestjs/common";
import { HydratedDocument, Model } from "mongoose";
import { Prop, Schema, SchemaFactory, InjectModel } from "@nestjs/mongoose";

import { Sku as _, ENUM_ORDER, ENUM_POUNDS_FORMULA, ENUM_LAYOUT_CABINET } from "qqlx-core";
import { MongooseDao } from "qqlx-sdk";

@Schema()
export class Sku implements _ {
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
    name: string;
    @Prop({ default: "" })
    norm: string;
    @Prop({ default: "" })
    unit: string;
    @Prop({ default: "" })
    remark: string;

    @Prop({
        default: 0,
        set: (value) => parseInt(((Number(value) || 0) * 1000).toString()),
    })
    pounds: number;
    @Prop({
        default: 0,
        set: (value) => parseInt((Number(value) || 0).toString()),
    })
    count: number;
    @Prop({
        default: 0,
        set: (value) => parseInt(((Number(value) || 0) * 1000).toString()),
    })
    poundsFinal: number;
    @Prop({
        default: 0,
        set: (value) => parseInt((Number(value) || 0).toString()),
    })
    countFinal: number;

    @Prop({
        default: 0,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    price: number;
    @Prop({ default: false })
    isPriceInPounds: boolean;
    @Prop({ default: false })
    isConfirmed: boolean;

    @Prop({
        default: ENUM_LAYOUT_CABINET.SUMMARY,
        enum: [ENUM_LAYOUT_CABINET.SUMMARY, ENUM_LAYOUT_CABINET.INDIVIDUAL],
    })
    layout: ENUM_LAYOUT_CABINET;
    @Prop({
        default: ENUM_POUNDS_FORMULA.NONE,
        enum: [
            ENUM_POUNDS_FORMULA.NONE,
            ENUM_POUNDS_FORMULA.TS_PLATE,
            ENUM_POUNDS_FORMULA.TS_WFGG,
            ENUM_POUNDS_FORMULA.TS_FG,
            ENUM_POUNDS_FORMULA.TS_JXFG,
            ENUM_POUNDS_FORMULA.TS_WFGG_REGULAR,
            ENUM_POUNDS_FORMULA.TS_FG_REGULAR,
            ENUM_POUNDS_FORMULA.TS_JXFG_REGULAR,
            ENUM_POUNDS_FORMULA.TS_DBJG,
            ENUM_POUNDS_FORMULA.TS_BDBJG,
            ENUM_POUNDS_FORMULA.TS_HXG,
        ],
    })
    formula: ENUM_POUNDS_FORMULA;

    @Prop({ default: "" })
    keyOrigin: string;
    @Prop({ default: "" })
    keyFeat: string;
    @Prop({ default: "" })
    keyCode: string;
    @Prop({ default: "" })
    keyHouse: string;

    @Prop({ default: "", required: true })
    corpId: string;
    @Prop({ default: "" })
    warehouseId: string;
    @Prop({ default: "" })
    areaId: string;

    @Prop({ default: "", required: true })
    orderId: string;
    @Prop({ default: "" })
    orderContactId: string;
    @Prop({ default: false })
    orderIsDisabled: boolean;

    @Prop({ default: "" })
    deductionSkuId: string;

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
export const SkuSchema = SchemaFactory.createForClass(Sku).set("versionKey", false);

@Injectable()
export class SkuDao extends MongooseDao<Sku> {
    constructor(@InjectModel(Sku.name) private model: Model<Sku>) {
        super(model);
    }
}
