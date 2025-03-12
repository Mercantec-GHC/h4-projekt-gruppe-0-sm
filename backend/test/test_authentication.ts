import { assertEquals, assertMatch } from "jsr:@std/assert";

const url = `http://127.0.0.1:8080`;
// const url = `http://10.135.51.114:8080`;

const name = "Maksim";
const email = `mash.skp_${Math.floor(Math.random() * 100000)}@edu.mercantec.dk`;
const password = "Merc1234";

Deno.test("test", async () => {
    const registerRes = await post<{ ok: boolean }>(
        `/api/users/register`,
        { name, email, password },
    );

    assertEquals(registerRes, { ok: true });

    const loginRes = await post<{
        ok: true;
        token: string;
    }>(
        "/api/sessions/login",
        { email, password },
    );

    assertEquals(loginRes.ok, true);
    assertMatch(loginRes.token, /^[0-9a-zA-Z]+$/);
    const token = loginRes.token;

    const sessionUserRes = await get<{
        ok: boolean;
        user: unknown;
    }>(
        "/api/sessions/user",
        { "Session-Token": token },
    );

    assertEquals(sessionUserRes.ok, true);
    console.log(sessionUserRes.user);

    const logoutRes = await post<{ ok: boolean }>(
        "/api/sessions/logout",
        {},
        { "Session-Token": token },
    );

    assertEquals(logoutRes, { ok: true });
});

function get<Res>(
    path: string,
    headers: Record<string, string>,
): Promise<Res> {
    return fetch(`${url}${path}`, { headers })
        .then((res) => res.json());
}

function post<Res, Req = unknown>(
    path: string,
    body: Req,
    headers: Record<string, string> = {},
): Promise<Res> {
    return fetch(`${url}${path}`, {
        method: "post",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }).then((res) => res.json());
}
