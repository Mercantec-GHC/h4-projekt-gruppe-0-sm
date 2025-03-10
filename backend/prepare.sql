
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY,
    name TEXT NOT NULL,
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



INSERT OR REPLACE INTO users VALUES(1,'User','test@email.com','08ce0220f6d63d85c3ac313e308f4fca35ecfb850baa8ddb924cfab98137b6b18b4a8e027067cb98802757df1337246a0f3aa25c44c2b788517a871086419dcf',10000);

INSERT OR REPLACE INTO products VALUES(1,'Letmælk',1195,'Mælk fra ko',NULL,NULL);
INSERT OR REPLACE INTO products VALUES(2,'Smør',2000,'Smør fra mejeri',NULL,NULL);
