import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Book, BookOfOrder, BookJoined } from "qqlx-core";

import { BookDao, BookOfOrderDao } from "dao/book";
import { JoinService } from "src/join/service";

@Injectable()
export class BookService {
    constructor(
        private readonly joinService: JoinService,
        //
        private readonly BookDao: BookDao,
        private readonly BookOfOrderDao: BookOfOrderDao
    ) {}

    async getBookJoined(books: Book[]): Promise<BookJoined[]> {
        const order_ofs = await this.getBookOfOrder(books.map((e) => e._id));

        return (books as BookJoined[]).map((book) => {
            book.joinBookOfOrder = order_ofs.filter((ee) => ee.bookId === book._id);
            return book;
        });
    }

    async getBookOfOrder(bookIds: string[]): Promise<BookOfOrder[]> {
        const result = await this.BookOfOrderDao.aggregate([
            { $match: { bookId: { $in: bookIds } } },
            { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "joinOrder" } },
            { $lookup: { from: "contacts", localField: "orderContactId", foreignField: "_id", as: "joinContact" } },
        ]);
        result.forEach((e) => {
            e.joinOrder && (e.joinOrder = e.joinOrder[0]);
            e.joinContact && (e.joinContact = e.joinContact[0]);
        });

        return result;
    }

    async deleteBookOfOrders(corpId: string, bookIds: string[]) {
        const ofs = await this.BookOfOrderDao.query({ bookId: { $in: bookIds } });
        await this.BookOfOrderDao.deleteMany(ofs.map((e) => e._id));

        const orderIds = [...new Set(ofs.map((e) => e.orderId))];
        for (let id of orderIds) await this.joinService.resetOrderAmount(corpId, id);
    }
}
