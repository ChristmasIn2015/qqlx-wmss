import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { Book, BookOfOrder, BookSchema, BookOfOrderSchema, BookDao, BookOfOrderDao } from "dao/book";
import { Cabinet, CabinetSchema, CabinetDao, CabinetUnit, CabinetUnitSchema, CabinetUnitDao } from "dao/cabinet";
import { Clue, ClueSchema, ClueDao } from "dao/clue";
import { Order, OrderSchema, OrderDao } from "dao/order";
import { Sku, SkuSchema, SkuDao } from "dao/sku";
import { ContactAnalysis, ContactAnalysisSchema, ContactAnalysisDao } from "dao/analysis";
import { LogRemote } from "remote/log";
import { UserRemote } from "remote/user";
import { BrandRemote } from "remote/brand";
import { MarketRemote } from "remote/market";
import { JoinService } from "src/join/service";
import { ClueService } from "src/clue/service";
import { BookService } from "src/book/service";
import { SkuService } from "src/sku/service";
import { OrderService } from "src/order/service";
import { CabinetUnitService } from "src/cabinetUnit/service";
import { AnalysisService } from "src/analysis/service";

import { AnalysisController } from "src/analysis/controller.rest";
import { ClueController } from "src/clue/controller.rest";
import { BookController } from "src/book/controller.rest";
import { CabinetController } from "src/cabinet/controller.rest";
import { CabinetUnitController } from "src/cabinetUnit/controller.rest";
import { OrderController } from "src/order/controller.rest";
import { SkuController } from "src/sku/controller.rest";

@Module({
    imports: [
        MongooseModule.forRoot("mongodb://127.0.0.1:27017/qqlx"),
        MongooseModule.forFeature([
            { name: Clue.name, schema: ClueSchema },
            { name: Book.name, schema: BookSchema },
            { name: BookOfOrder.name, schema: BookOfOrderSchema },
            { name: Cabinet.name, schema: CabinetSchema },
            { name: CabinetUnit.name, schema: CabinetUnitSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Sku.name, schema: SkuSchema },
            { name: ContactAnalysis.name, schema: ContactAnalysisSchema },
        ]),
    ],
    controllers: [
        AnalysisController,
        BookController,
        CabinetController,
        CabinetUnitController,
        OrderController,
        SkuController,
        ClueController,
        //
    ],
    providers: [
        BookDao,
        BookOfOrderDao,
        CabinetDao,
        CabinetUnitDao,
        ClueDao,
        OrderDao,
        SkuDao,
        ContactAnalysisDao,
        LogRemote,
        UserRemote,
        BrandRemote,
        MarketRemote,
        JoinService,
        ClueService,
        BookService,
        CabinetUnitService,
        SkuService,
        OrderService,
        AnalysisService,
    ],
})
export class AppModule {}
