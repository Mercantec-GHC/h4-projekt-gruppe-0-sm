
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY,
    user INTEGER NOT NULL,
    total_dkk_cent INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,

    FOREIGN KEY(user) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS receipt_products (
    id INTEGER PRIMARY KEY,
    receipt INTEGER NOT NULL,
    product_price INTEGER NOT NULL,
    amount INTEGER NOT NULL,

    FOREIGN KEY(receipt) REFERENCES receipts(id)
    FOREIGN KEY(product_price) REFERENCES product_prices(id)
);

CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY,
    product INTEGER NOT NULL UNIQUE,
    data BLOB NOT NULL,

    FOREIGN KEY(product) REFERENCES products(id)
);

INSERT OR REPLACE INTO users (name, email, password_hash, balance_dkk_cent)
    VALUES ('User','test@email.com','08ce0220f6d63d85c3ac313e308f4fca35ecfb850baa8ddb924cfab98137b6b18b4a8e027067cb98802757df1337246a0f3aa25c44c2b788517a871086419dcf',10000);

INSERT OR REPLACE INTO products (name, price_dkk_cent, description, coord, barcode) VALUES
    ('Minimælk',1195,'Konventionel minimælk med fedtprocent på 0,4%',NULL,NULL),
    ('Letmælk',1295,'Konventionel letmælk med fedtprocent på 1,5%',NULL,NULL),
    ('Frilands Øko Supermælk',1995,'Økologisk mælk af frilandskøer med fedtprocent på 3,5%. Ikke homogeniseret eller pasteuriseret. Skaber store muskler og styrker knoglerne 💪',NULL,NULL),
    ('Øko Gulerødder 1 kg',995,'',NULL,NULL),
    ('Øko Agurk', 995, 'Øko Agurk fra gården', NULL, NULL),
    ('Æbler 1 kg', 995, 'Friske danske æbler', NULL, NULL),
    ('Basmati Ris', 1995, 'Løse og duftende ris', NULL, NULL),
    ('Haribo Mix', 2995, 'Lækre Haribo slik', NULL, NULL),
    ('Harboe Cola', 495, 'Sød og forfriskende cola', NULL, NULL),
    ('Monster Energi Drik', 1495, '', NULL, '5060337502900'),
    ('Amper Energi Drik', 595, '', NULL, '5712870659220'),
    ('Danskvand Med Brus', 495, 'Med smag af blåbær', NULL, '5710326001937'),
    ('Spaghetti', 995, 'Perfekt til pasta-retter', NULL, NULL),
    ('Rød Cecil', 5995, 'Populære cigaretter', NULL, NULL),
    ('Jägermeister 750 ml', 11995, 'Krydret urtelikør', NULL, NULL)


