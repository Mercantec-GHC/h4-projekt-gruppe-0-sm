#pragma once

#include "db.h"
#include <sqlite3.h>

struct Db {
    int empty;
};

Db* db_sqlite_new(void);
void db_sqlite_free(Db* db);
