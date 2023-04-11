import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Book, BookJoined, BookOfOrder, BookOfSelf } from "qqlx-core";

import { BookDao, BookOfOrderDao, BookOfSelfDao } from "dao/book";
import { JoinService } from "src/join/service";

@Injectable()
export class BookService {
    constructor(
        private readonly joinService: JoinService,
        //
        private readonly BookDao: BookDao,
        private readonly BookOfOrderDao: BookOfOrderDao,
        private readonly BookOfSelfDao: BookOfSelfDao
    ) {}

    async getBookJoined(bookIds: string[], sortKey?: string, sortValue?: MongodbSort): Promise<BookJoined[]> {
        const books = await this.BookDao.query({ _id: { $in: bookIds } }, { sortKey, sortValue });

        const order_ofs = await this.getBookOfOrder(books.map((e) => e._id));
        const self_ofs = await this.getBookOfSelf(books);

        return (books as BookJoined[]).map((book) => {
            book.joinBookOfOrder = order_ofs.filter((ee) => ee.bookId === book._id);
            book.joinBookOfSelf = self_ofs.filter((ee) => ee.invoiceId === book._id);
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

    async getBookOfSelf(books: Book[]): Promise<BookOfSelf[]> {
        const result = await this.BookOfSelfDao.aggregate([
            { $match: { invoiceId: { $in: books.map((e) => e._id) } } },
            { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "joinBook" } },
        ]);
        result.forEach((e) => {
            e.joinBook && (e.joinBook = e.joinBook[0]);
        });

        return result;
    }

    async deleteBookOfOrders(corpId: string, bookIds: string[]) {
        const ofs = await this.BookOfOrderDao.query({ bookId: { $in: bookIds } });
        await this.BookOfOrderDao.deleteMany(ofs.map((e) => e._id));

        const orderIds = [...new Set(ofs.map((e) => e.orderId))];
        for (let id of orderIds) await this.joinService.resetAmountOrder(corpId, id);
    }

    async deleteBookOfSelfs(corpId: string, invoiceIds: string[]) {
        const match = { $or: [{ invoiceId: { $in: invoiceIds } }] };

        const ofs = await this.BookOfSelfDao.query(match);
        await this.BookOfSelfDao.deleteMany(ofs.map((e) => e._id));

        const bookIds = [...new Set(ofs.map((e) => e.bookId))];
        for (let id of bookIds) await this.joinService.resetAmountBook(corpId, id);
    }
}
