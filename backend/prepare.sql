
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    balance_dkk_cent INT NOT NULL
);

CREATE TABLE IF NOT EXISTS coords (
    id INT PRIMARY KEY,
    x INT NOT NULL,
    y INT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
    price_dkk_cent INT NOT NULL,
    description TEXT NOT NULL,
    coord INT,
    barcode TEXT,

    FOREIGN KEY(coord) REFERENCES coords(id)
);

CREATE TABLE IF NOT EXISTS product_prices (
    id INT PRIMARY KEY,
    product INT NOT NULL,
    price_dkk_cent INT NOT NULL,

    FOREIGN KEY(product) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS carts (
    id INT PRIMARY KEY,
    user INT NOT NULL,

    FOREIGN KEY(user) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cart_items (
    id INT PRIMARY KEY,
    cart INT NOT NULL,
    amount INT NOT NULL,

    FOREIGN KEY(cart) REFERENCES carts(id)
);



INSERT OR REPLACE INTO users VALUES(1,'test@email.com','d980840fcb82970ab86656feebdccdd288be0e9b05f14e712b59529a2868fee3d980840fcb82970ab86656feebdccdd288be0e9b05f14e712b59529a2868fee3',10000);

INSERT OR REPLACE INTO products VALUES(1,'Letmælk',1195,'Mælk fra ko',NULL,NULL);
INSERT OR REPLACE INTO products VALUES(2,'Smør',2000,'Smør fra mejeri',NULL,NULL);
