
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
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
    coord INTEGER,
    barcode TEXT,

    FOREIGN KEY(coord) REFERENCES coords(id)
);

CREATE TABLE IF NOT EXISTS product_prices (
    id INTEGER PRIMARY KEY,
    product INTEGER NOT NULL,
    price_dkk_cent INTEGER NOT NULL,

    FOREIGN KEY(product) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY,
    user INTEGER NOT NULL,

    FOREIGN KEY(user) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY,
    cart INTEGER NOT NULL,
    amount INTEGER NOT NULL,

    FOREIGN KEY(cart) REFERENCES carts(id)
);


