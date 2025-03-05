#pragma once

#include "models.h"
#include <sqlite3.h>

int user_sqlite_from_id(User* model, sqlite3* db, int64_t id);

int coord_sqlite_from(Coord* model, sqlite3* db);

int product_sqlite_from(Product* model, sqlite3_stmt* stmt);

int product_price_sqlite_from(ProductPrice* model, sqlite3_stmt* stmt);

int cart_sqlite_from(Cart* model, sqlite3_stmt* stmt);

int cart_item_sqlite_from(CartItem* model, sqlite3_stmt* stmt);
