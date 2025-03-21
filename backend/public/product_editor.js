const productList = document.querySelector("#product-list");
const editor = {
    form: document.querySelector("#editor"),
    loadButton: document.querySelector("#editor #load"),
    saveButton: document.querySelector("#editor #save"),
    newButton: document.querySelector("#editor #new"),
    idInput: document.querySelector("#editor #product-id"),
    nameInput: document.querySelector("#editor #product-name"),
    priceInput: document.querySelector("#editor #product-price"),
    coordInput: document.querySelector("#editor #product-coord"),
    barcodeInput: document.querySelector("#editor #product-barcode"),
    descriptionTextarea: document.querySelector("#editor #product-description"),
};
const imageUploader = {
    form: document.querySelector("#image-uploader"),
    idInput: document.querySelector("#image-uploader #product-id"),
    saveButton: document.querySelector("#image-uploader #save"),
    preview: document.querySelector("#image-uploader #preview"),
    fileInput: document.querySelector("#image-uploader #file"),
};
const coords = {
    form: document.querySelector("#coords"),
    idInput: document.querySelector("#coords #product-id"),
    xInput: document.querySelector("#coords #coords-x"),
    yInput: document.querySelector("#coords #coords-y"),
    saveButton: document.querySelector("#coords #save"),
};

let products = [];

let selectedProductId = null;

function selectProduct(product) {
    selectedProductId = product.id;

    editor.idInput.value = product.id.toString();
    editor.nameInput.value = product.name;
    editor.priceInput.value = product.price_dkk_cent / 100;
    editor.descriptionTextarea.value = product.description;
    editor.coordInput.value = product.coord_id.toString();
    editor.barcodeInput.value = product.barcode.toString();

    imageUploader.idInput.value = product.id;
    coords.idInput.value = product.id;
}

function loadProduct() {
    selectedProductId = parseInt(editor.idInput.value);

    const product = products.find((product) =>
        product.id === selectedProductId
    );
    if (!product) {
        alert(`no product with id ${selectedProductId}`);
        return;
    }

    selectProduct(product);
}

function productFromForm() {
    return {
        id: parseInt(editor.idInput.value),
        name: editor.nameInput.value,
        description: editor.descriptionTextarea.value,
        price_dkk_cent: Math.floor(parseFloat(editor.priceInput.value) * 100),
        coord_id: parseInt(editor.coordInput.value),
        barcode: editor.barcodeInput.value,
    };
}

async function saveProduct() {
    const product = productFromForm();
    await fetch("/api/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
    }).then((res) => res.json());

    await updateProductList();
}

async function newProduct() {
    const product = productFromForm();
    await fetch("/api/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
    }).then((res) => res.json());

    await updateProductList();
}

async function updateProductList() {
    const res = await fetch("/api/products/all")
        .then((res) => res.json());

    products = res.products;

    productList.innerHTML = `
        <tr>
            <th>id</th>
            <th>name</th>
            <th>price_dkk_cent</th>
            <th>description</th>
            <th>coord_id</th>
            <th>barcode</th>
            <th> </th>
        </tr>
    `;
    productList.innerHTML += products
        .map((product) => `
            <tr>
                <td><code>${product.id}</code></td>
                <td><strong>${product.name}</strong></td>
                <td>${product.price_dkk_cent / 100} dkk</td>
                <td>${product.description}</td>
                <td><code>${product.coord_id}</code></td>
                <td><code>${product.barcode}</code></td>
                <td><button id="product-${product.id}-edit">Edit</button></td>
            </tr>
        `)
        .join("");

    for (const product of products) {
        document
            .querySelector(`#product-${product.id}-edit`)
            .addEventListener("click", () => {
                selectProduct(product);
            });
    }
}

updateProductList();

editor.form
    .addEventListener("submit", (e) => {
        e.preventDefault();
    });
editor.loadButton
    .addEventListener("click", (_e) => {
        loadProduct();
    });
editor.saveButton
    .addEventListener("click", (_e) => {
        saveProduct();
    });
editor.newButton
    .addEventListener("click", (_e) => {
        newProduct();
    });

imageUploader.form
    .addEventListener("submit", (e) => {
        e.preventDefault();
    });
imageUploader.fileInput
    .addEventListener("input", (e) => {
        e.preventDefault();
        const image = imageUploader.fileInput.files[0];
        const data = URL.createObjectURL(image);
        imageUploader.preview.src = data;
    });
imageUploader.saveButton
    .addEventListener("click", async (_e) => {
        const id = parseInt(imageUploader.idInput.value);
        const image = imageUploader.fileInput.files[0];

        const buffer = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener("loadend", () => {
                resolve(reader.result);
            });
            reader.readAsArrayBuffer(image);
        });

        await fetch(`/api/products/set-image?product_id=${id}`, {
            method: "post",
            headers: { "Content-Type": image.type },
            body: buffer,
        }).then((res) => res.json());
    });
coords.form
    .addEventListener("submit", (e) => {
        e.preventDefault();
    });
coords.saveButton
    .addEventListener("click", async (_e) => {
        const product_id = parseInt(coords.idInput.value);
        const x = parseInt(coords.xInput.value);
        const y = parseInt(coords.yInput.value);

        await fetch(`/api/products/set_coords`, {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id, x, y }),
        }).then((res) => res.json());
    });
