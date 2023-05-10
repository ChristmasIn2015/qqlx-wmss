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

    @Prop({
        default: ENUM_LAYOUT_CABINET.SUMMARY,
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
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    price: number;
    @Prop({ default: "" })
    areaId: string;

    @Prop({
        default: 0,
        set: (value) => parseInt((Number(value) || 0).toString()),
    })
    countFinal: number;
    @Prop({
        default: 0,
        set: (value) => parseInt(((Number(value) || 0) * 1000).toString()),
    })
    poundsFinal: number;

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
