import { assertEquals, assertMatch, assertNotEquals } from "jsr:@std/assert";

const url = Deno.env.get("BACKEND_SERVER_HOSTNAME") ?? `http://127.0.0.1:8080`;

const name = "Maksim";
const email = `mash.skp_${Math.floor(Math.random() * 100000)}@edu.mercantec.dk`;
const password = "Merc1234";

Deno.test("test backend", async (t) => {
    await t.step("test /api/users/register", async () => {
        const registerRes = await post<{ ok: boolean }>(
            `/api/users/register`,
            { name, email, password },
        );
        assertEquals(registerRes, { ok: true });
    });

    let token: string | undefined = undefined;

    await t.step("test /api/sessions/login", async () => {
        const loginRes = await post<{
            ok: true;
            token: string;
        }>(
            "/api/sessions/login",
            { email, password },
        );

        //console.log(loginRes);
        assertEquals(loginRes.ok, true);
        assertMatch(loginRes.token, /^[0-9a-zA-Z]+$/);
        token = loginRes.token;
    });

    if (!token) {
        return;
    }

    await t.step("test /api/sessions/user", async () => {
        const sessionUserRes = await get<{
            ok: boolean;
            user: unknown;
        }>(
            "/api/sessions/user",
            { "Session-Token": token! },
        );

        //console.log(sessionUserRes.user);
        assertEquals(sessionUserRes.ok, true);
    });

    const user1 = await sessionUser(token);

    await t.step("test /api/users/balance/add", async () => {
        const sessionUserRes = await post<{ ok: boolean }>(
            "/api/users/balance/add",
            {},
            { "Session-Token": token! },
        );

        //console.log(sessionUserRes);
        assertEquals(sessionUserRes.ok, true);
    });

    const user2 = await sessionUser(token);
    assertNotEquals(user1.balance_dkk_cent, user2.balance_dkk_cent);

    await testCartsAndReceipts(t, token!);

    await testProductsCoords(t);

    await t.step("test /api/sessions/logout", async () => {
        const logoutRes = await post<{ ok: boolean }>(
            "/api/sessions/logout",
            {},
            { "Session-Token": token! },
        );

        assertEquals(logoutRes, { ok: true });
    });
});

async function testCartsAndReceipts(t: Deno.TestContext, token: string) {
    let receiptId: number | undefined = undefined;

    await t.step("test /api/receipts/all", async () => {
        const res = await get<{
            ok: boolean;
            receipts: { timestamp: string }[];
        }>(
            `/api/receipts/all`,
            { "Session-Token": token },
        );

        // console.log(res);
        assertEquals(res.ok, true);
        assertEquals(res.receipts.length, 0);
    });

    const user1 = await sessionUser(token);

    await t.step("test /api/carts/purchase", async () => {
        const res = await post<{ ok: boolean; receipt_id: number }>(
            "/api/carts/purchase",
            {
                items: [
                    { product_id: 1, amount: 5 },
                    { product_id: 2, amount: 2 },
                ],
            },
            { "Session-Token": token },
        );

        //console.log(res);
        assertEquals(res.ok, true);
        receiptId = res.receipt_id;
    });

    const user2 = await sessionUser(token);
    assertNotEquals(user1.balance_dkk_cent, user2.balance_dkk_cent);
    assertEquals(
        user1.balance_dkk_cent - user2.balance_dkk_cent,
        1195 * 5 + 1295 * 2,
    );

    if (!receiptId) {
        return;
    }

    await t.step("test /api/receipts/one", async () => {
        const res = await get<{ ok: boolean }>(
            `/api/receipts/one?receipt_id=${receiptId}`,
            { "Session-Token": token },
        );

        // console.log(res);
        assertEquals(res.ok, true);
    });

    await t.step("test /api/receipts/all", async () => {
        const res = await get<{
            ok: boolean;
            receipts: { timestamp: string }[];
        }>(
            `/api/receipts/all`,
            { "Session-Token": token },
        );

        // console.log(res);
        assertEquals(res.ok, true);
        assertEquals(res.receipts.length, 1);
        assertMatch(
            res.receipts[0].timestamp,
            /\d{4}-[01]\d-[0-3]\d [0-2]\d:[0-5]\d:[0-5]\d/,
        );
    });
}

async function testProductsCoords(t: Deno.TestContext) {
    const productId = 1;
    let coords: { x: number; y: number } | null = null;

    await t.step("test /api/products/coords", async () => {
        const res = await get<{
            ok: boolean;
            found: boolean;
            coords: { x: number; y: number };
        }>(
            `/api/products/coords?product_id=${productId}`,
            {},
        );

        // console.log(res);
        assertEquals(res.ok, true);
        if (res.found) {
            coords = res.coords;
        } else {
            coords = null;
        }
    });

    await t.step("test /api/products/set_coords", async () => {
        const res = await post<{ ok: boolean }>(
            "/api/products/set_coords",
            {
                product_id: productId,
                x: 1,
                y: 2,
            },
            {},
        );

        // console.log(res);
        assertEquals(res.ok, true);
    });

    await t.step("test /api/products/coords", async () => {
        const res = await get<{
            ok: boolean;
            found: true;
            coords: { x: number; y: number };
        }>(
            `/api/products/coords?product_id=${productId}`,
            {},
        );

        // console.log(res);
        assertEquals(res.ok, true);
        assertEquals(res.found, true);
        assertEquals(res.coords.x, 1);
        assertEquals(res.coords.y, 2);
    });

    if (coords !== null) {
        const res = await post<{ ok: boolean }>(
            "/api/products/set_coords",
            { product_id: productId, ...coords as { x: number; y: number } },
            {},
        );
        // console.log(res);
        assertEquals(res.ok, true);
    }
}

type SessionUser = { id: number; email: string; balance_dkk_cent: number };

async function sessionUser(
    token: string,
): Promise<SessionUser> {
    const res = await get<{
        ok: boolean;
        user: SessionUser;
    }>(
        "/api/sessions/user",
        { "Session-Token": token! },
    );
    if (!res.ok) {
        throw new Error();
    }
    // console.log(res.user);
    return res.user;
}

function get<Res>(
    path: string,
    headers: Record<string, string>,
): Promise<Res> {
    return fetch(`${url}${path}`, {
        headers: { ...headers, "Accept": "application/json" },
    })
        .then((res) => res.json());
}

function post<Res, Req = unknown>(
    path: string,
    body: Req,
    headers: Record<string, string> = {},
): Promise<Res> {
    return fetch(`${url}${path}`, {
        method: "post",
        headers: {
            ...headers,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(body),
    }).then((res) => res.json());
}
