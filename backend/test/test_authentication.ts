import { assertEquals, assertMatch } from "jsr:@std/assert";

import axios from "npm:axios";

const url = `http://127.0.0.1:8080`;
// const url = `http://10.135.51.114:8080`;

const name = "Maksim";
const email = `mash.skp_${Math.floor(Math.random() * 100000)}@edu.mercantec.dk`;
const password = "Merc1234";

Deno.test("test", async () => {
    const registerRes = await axios.post(
        `${url}/api/users/register`,
        { name, email, password },
        { responseType: "json" },
    )
        .then((res) => res.data);

    assertEquals(registerRes, { ok: true });

    const loginRes = await axios.post(
        `${url}/api/sessions/login`,
        { email, password },
        { responseType: "json" },
    ).then((res) => res.data);

    assertEquals(loginRes.ok, true);
    assertMatch(loginRes.token, /^[0-9a-zA-Z]+$/);
    const token = loginRes.token;

    const sessionUserRes = await axios.get(
        `${url}/api/sessions/user`,
        { headers: { "Session-Token": token } },
    )
        .then((res) => res.data)
        .catch((error) => error.response.data);

    assertEquals(sessionUserRes.ok, true);
    console.log(sessionUserRes.user);

    const logoutRes = await axios.post(
        `${url}/api/sessions/logout`,
        {},
        { responseType: "json", headers: { "Session-Token": token } },
    ).then((res) => res.data);

    assertEquals(logoutRes, { ok: true });
});
