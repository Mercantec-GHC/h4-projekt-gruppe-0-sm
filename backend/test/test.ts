import { assertEquals, assertMatch, assertNotEquals } from "jsr:@std/assert";

const url = `http://127.0.0.1:8080`;
// const url = `http://10.135.51.114:8080`;

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

        // console.log(sessionUserRes.user);
        assertEquals(sessionUserRes.ok, true);
    });

    const user1 = await sessionUser(token);

    await t.step("test /api/users/balance/add", async () => {
        const sessionUserRes = await post<{ ok: boolean }>(
            "/api/users/balance/add",
            {},
            { "Session-Token": token! },
        );

        // console.log(sessionUserRes);
        assertEquals(sessionUserRes.ok, true);
    });

    const user2 = await sessionUser(token);
    assertNotEquals(user1.balance_dkk_cent, user2.balance_dkk_cent);

    await testCartsAndReceipts(t, token!);

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

    const user1 = await sessionUser(token);

    await t.step("test /api/carts/purchase", async () => {
        const res = await post<{ ok: boolean; receipt_id: number }>(
            "/api/carts/purchase",
            {
                items: [
                    { product_id: 1, amount: 2 },
                    { product_id: 2, amount: 5 },
                ],
            },
            { "Session-Token": token },
        );

        assertEquals(res.ok, true);
        receiptId = res.receipt_id;
    });

    const user2 = await sessionUser(token);
    assertNotEquals(user1.balance_dkk_cent, user2.balance_dkk_cent);
    assertEquals(
        user1.balance_dkk_cent - user2.balance_dkk_cent,
        1195 * 2 + 1295 * 5,
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
