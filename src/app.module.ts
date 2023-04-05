import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { Book, BookOfOrder, BookOfSelf, BookSchema, BookOfOrderSchema, BookOfSelfSchema, BookDao, BookOfOrderDao, BookOfSelfDao } from "dao/book";
import { Cabinet, CabinetSchema, CabinetDao, CabinetUnit, CabinetUnitSchema, CabinetUnitDao } from "dao/cabinet";
import { Clue, ClueSchema, ClueDao } from "dao/clue";
import { Order, OrderSchema, OrderDao } from "dao/order";
import { Sku, SkuSchema, SkuDao } from "dao/sku";
import { LogRemote } from "remote/log";
import { UserRemote } from "remote/user";
import { BrandRemote } from "remote/brand";
import { MarketRemote } from "remote/market";
import { JoinService } from "src/join/service";
import { BookService } from "src/book/service";
import { SkuService } from "src/sku/service";
import { OrderService } from "src/order/service";
import { CabinetUnitService } from "src/cabinetUnit/service";

import { BookController } from "src/book/controller.rest";
import { CabinetController } from "src/cabinet/controller.rest";
import { OrderController } from "src/order/controller.rest";
import { SkuController } from "src/sku/controller.rest";

@Module({
    imports: [
        MongooseModule.forRoot("mongodb://127.0.0.1:27017/qqlx"),
        MongooseModule.forFeature([
            { name: Book.name, schema: BookSchema },
            { name: BookOfOrder.name, schema: BookOfOrderSchema },
            { name: BookOfSelf.name, schema: BookOfSelfSchema },
            { name: Cabinet.name, schema: CabinetSchema },
            { name: CabinetUnit.name, schema: CabinetUnitSchema },
            { name: Clue.name, schema: ClueSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Sku.name, schema: SkuSchema },
        ]),
    ],
    controllers: [BookController, CabinetController, OrderController, SkuController],
    providers: [
        BookDao,
        BookOfOrderDao,
        BookOfSelfDao,
        CabinetDao,
        CabinetUnitDao,
        ClueDao,
        OrderDao,
        SkuDao,
        LogRemote,
        UserRemote,
        BrandRemote,
        MarketRemote,
        JoinService,
        BookService,
        CabinetUnitService,
        SkuService,
        OrderService,
    ],
})
export class AppModule {}
