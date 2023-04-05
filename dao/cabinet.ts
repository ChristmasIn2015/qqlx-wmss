import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { Prop, Schema, SchemaFactory, InjectModel } from "@nestjs/mongoose";

import { ENUM_POUNDS_FORMULA, ENUM_LAYOUT_CABINET, Cabinet as _Cabinet, CabinetUnit as _CabinetUnit } from "qqlx-core";
import { MongooseDao } from "qqlx-sdk";

@Schema()
export class Cabinet implements _Cabinet {
    @Prop({ default: "", required: true })
    corpId: string;

    @Prop({ default: "" })
    name: string;
    @Prop({ default: "" })
    unit: string;
    @Prop({ default: false })
    isDisabled: boolean;

    @Prop({
        default: ENUM_POUNDS_FORMULA.NONE,
        enum: [ENUM_POUNDS_FORMULA.NONE, ENUM_POUNDS_FORMULA.STEEL_PLATE],
    })
    formula: ENUM_POUNDS_FORMULA;

    @Prop({
        default: ENUM_LAYOUT_CABINET.SUMMARY,
        enum: [ENUM_LAYOUT_CABINET.SUMMARY, ENUM_LAYOUT_CABINET.INDIVIDUAL],
    })
    layout: ENUM_LAYOUT_CABINET;

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
export const CabinetSchema = SchemaFactory.createForClass(Cabinet).set("versionKey", false);

@Injectable()
export class CabinetDao extends MongooseDao<Cabinet> {
    constructor(@InjectModel(Cabinet.name) private model: Model<Cabinet>) {
        super(model);
    }
}

@Schema()
export class CabinetUnit implements _CabinetUnit {
    @Prop({ default: "", required: true })
    corpId: string;
    @Prop({ default: "", required: true })
    cabinetId: string;

    @Prop({ default: "" })
    name: string;
    @Prop({ default: "" })
    norm: string;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    price: number;

    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 1000,
        set: (value) => parseInt(((Number(value) || 0) * 1000).toString()),
    })
    poundsFinal: number;
    @Prop({ default: 0 })
    countFinal: number;

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
export const CabinetUnitSchema = SchemaFactory.createForClass(CabinetUnit).set("versionKey", false);

@Injectable()
export class CabinetUnitDao extends MongooseDao<CabinetUnit> {
    constructor(@InjectModel(CabinetUnit.name) private model: Model<CabinetUnit>) {
        super(model);
    }
}
