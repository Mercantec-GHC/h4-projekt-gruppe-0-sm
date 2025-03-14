
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    balance_dkk_cent INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS coords (
    id INTEGER PRIMARY KEY,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price_dkk_cent INTEGER NOT NULL,
    description TEXT NOT NULL,
    coord INT,
    barcode TEXT,

    FOREIGN KEY(coord) REFERENCES coords(id)
);

CREATE TABLE IF NOT EXISTS product_prices (
    id INTEGER PRIMARY KEY,
    product INTEGER NOT NULL,
    price_dkk_cent INTEGER NOT NULL,

    FOREIGN KEY(product) REFERENCES products(id)
);

INSERT OR REPLACE INTO users (name, email, password_hash, balance_dkk_cent)
    VALUES ('User','test@email.com','08ce0220f6d63d85c3ac313e308f4fca35ecfb850baa8ddb924cfab98137b6b18b4a8e027067cb98802757df1337246a0f3aa25c44c2b788517a871086419dcf',10000);

INSERT OR REPLACE INTO products (name, price_dkk_cent, description, coord, barcode)
    VALUES ('Letmælk',1195,'Mælk fra ko',NULL,NULL);

INSERT OR REPLACE INTO products (name, price_dkk_cent, description, coord, barcode)
    VALUES ('Smør',2000,'Smør fra mejeri',NULL,NULL);

