# Yostar account sync (Global / EN)

Status: implemented in `feat/yostar-sync` (Task 31). **Live login is owner/team-lead territory**:
the implementation and its tests are complete, the real end-to-end login with a personal
e-mail and code has not been run by the agent and must be verified by the owner.

Этот документ — единственный источник истины по эндпоинтам. Всё, что помечено «проверено»,
подтверждено HTTP-запросом с датой; всё остальное помечено как неподтверждённое.

## 1. What the user gets

`Sync → Yostar Email` tab: enter the e-mail, receive a 6-digit code from Yostar, enter it, and
the app imports

- the operator roster (elite phase, level, skill rank, mastery per skill, module stages,
  potential, trust),
- the depot (item counts),
- the account status (doctor name/level, LMD, Orundum, Originite Prime).

The depot and roster are replaced by the snapshot of the account. Nothing is written until the
proxy returns a successful, sanitized payload, so a failed login never wipes local data.

## 2. Endpoints (verified 2026-10-21)

All requests were made from Node 22 `fetch`; response status and a truncated body were recorded.

| Step | Method + URL                                                                        | Verified response (2026-10-21)                                                               |
| :--- | :---------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| 1    | `GET https://ak-conf.arknights.global/config/prod/official/network_config`          | `200`, `{ sign, content }`; `content` is a JSON string with `gs`, `as`, `u8`, `hv`           |
| 2    | `POST https://en-sdk-api.yostarplat.com/yostar/send-code`                           | `200`, `{ Code, Data, Msg }`; invalid e-mail → `Code: 100400` (`Account ... email tag`)      |
| 3    | `POST https://en-sdk-api.yostarplat.com/yostar/get-auth`                            | `200`, `{ Code: 100303 }` for a bogus code (`获取授权信息失败`)                              |
| 4    | `POST https://en-sdk-api.yostarplat.com/user/login`                                 | `200`, `{ Code: 100190 }` for a bogus token (`Yostar授权失败`)                               |
| 5    | `GET https://ark-us-static-online.yo-star.com/assetbundle/official/Android/version` | `200`, `{ resVersion: "26-10-03-16-06-39_0a6acf", clientVersion: "37.7.41" }`                |
| 6    | `POST {u8}/user/v1/getToken`                                                        | path taken from step 1 (`u8` = `https://as.arknights.global/u8`)                             |
| 7    | `POST {gs}/account/login`                                                           | `gs` = `https://gs.arknights.global:8443` (step 1)                                           |
| 8    | `POST {gs}/account/syncData`                                                        | `400`, `code: 5574`, `"seession secret not exist"` without a valid secret — the route exists |

The `as` host from the network config (`https://as.arknights.global`) **does not** serve the
SDK paths: `/yostar/*` and `/user/login` answer `404 page not found` there (verified). The
working account SDK base is `https://en-sdk-api.yostarplat.com`.

Sources (public open-source clients, both implement exactly this chain):

- `thesadru/ArkPRTS` → `arkprts/auth.py` (`YostarAuth`, `generate_yostarplat_headers`,
  `send_email_code`, `_submit_email_code`, `_get_yostar_token`, `_get_u8_token`,
  `_get_secret`), <https://github.com/thesadru/ArkPRTS/blob/master/arkprts/auth.py>
  (read 2026-10-21).
- `neeia/ak-roster` → `src/util/hgApi/yostarAuth.ts` and
  `src/types/arknightsApiTypes/apiTypes.ts` (same endpoints, `yostarDomains`,
  `networkConfigUrls`), commit `9b3d17ff92bd62fcfc16978d315ce75ef5b25111`
  (read 2026-10-21).

### Headers

Yostar SDK requests (`send-code`, `get-auth`, `user/login`):

```
Content-Type: application/json
Authorization: {"Head":{...},"Sign":"MD5(JSON(Head) + body + <client sign key>)"}
```

`Head` carries `PID: "US-ARKNIGHTS"`, `Channel: "googleplay"`, `Platform: "android"`,
`Version: "4.10.0"`, `GVersionNo: "2000112"`, `Lang: "en"`, a random `DeviceID`, `Time` in
seconds.

Game-server requests (`account/login`, `account/syncData`, `u8 getToken`) use
`Content-Type: application/json`, `User-Agent: Dalvik/2.1.0 (Linux; U; Android 11; ...)`,
`X-Unity-Version: 2017.4.39f1`, and `uid` / `secret` / `seqnum` headers (`seqnum` 1 for
`account/login`, 2 for `account/syncData`). The u8 request body is signed with HMAC-SHA1 over
the sorted form-encoded body.

The two signing keys (`886c085e…`, `91240f70…`) are **public game-client protocol constants**
published verbatim in the sources above. They identify the official Android client, they are
not user credentials and cannot authenticate anything on their own. They live in
`server/utils/yostar.ts` as named constants; no secret of this project is involved.

## 3. Stateless proxy

```
browser ──POST /api/yostar/send-code {email}──▶ Nitro ──▶ en-sdk-api.yostarplat.com
browser ──POST /api/yostar/login {email,code}─▶ Nitro ──▶ get-auth → user/login → network_config
                                                        → version → u8 getToken → account/login
                                                        → account/syncData
                                              └─ sanitized payload ──▶ browser
```

- `server/utils/yostar.ts` holds the whole flow. The e-mail, the code, the Yostar token, the
  u8 token and the session secret are locals of one request; nothing is cached, written to
  disk, Supabase or a log.
- The routes never log. Errors are `YostarError(reason)` whose `message` is the reason code
  only; upstream messages (Chinese `Msg` strings) are never forwarded to the client.
- `/api/yostar/login` answers with a payload validated by `YostarSyncPayloadSchema`: doctor
  name/level, operators, depot items, currencies, skip counters. No e-mail, uid or token field
  exists in the schema.
- Both routes set `cache-control: no-store`.
- Timeout: 8 s per upstream request (`YOSTAR_TIMEOUT_MS`); a timeout maps to `504`.
- The login chain makes **seven** sequential upstream calls; a cold Vercel function has a 10 s
  budget on Hobby, so a slow upstream can hit the platform limit before our own timeout. This
  is listed in `docs/known-issues.md`.

### Error mapping

| Reason            | HTTP | Meaning                                           |
| :---------------- | ---: | :------------------------------------------------ |
| `invalid_email`   |  400 | Yostar rejected the address (`Code 100400`)       |
| `invalid_code`    |  400 | Wrong/expired code (`100303`, `100302`, `100190`) |
| `rate_limited`    |  429 | Upstream HTTP 429 or `Code 100429`                |
| `timeout`         |  504 | No answer within 8 s                              |
| `unavailable`     |  502 | Other upstream/network failure                    |
| `invalid_payload` |  502 | Upstream answered with an unexpected shape        |
| `disabled`        |  404 | `NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=false`           |

Bodies: `{ ok: true }` for send-code, `{ ok: true, ...payload }` for login, and
`{ ok: false, error }` for every failure — the UI translates `error`, it never shows a raw
message.

## 4. `syncData` fields consumed

`POST {gs}/account/syncData` → `{ result: 0, user: { ... } }`. Only four paths are read; the
rest is dropped at the boundary.

| Path                                   | Used for                                                                                                       |
| :------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `user.status.nickName/level`           | doctor name and level                                                                                          |
| `user.status.gold`                     | LMD                                                                                                            |
| `user.status.diamondShard`             | Orundum                                                                                                        |
| `user.status.payDiamond + freeDiamond` | Originite Prime (paid + free, one balance)                                                                     |
| `user.troop.chars[*]`                  | roster: `charId`, `level`, `evolvePhase`, `mainSkillLvl`, `potentialRank`, `favorPoint`, `skills[]`, `equip{}` |
| `user.inventory`                       | `itemId -> count`                                                                                              |

## 5. Mapping rules (`shared/utils/yostar`)

- `elite = clamp(evolvePhase, 0..2)`, `level = clamp(level, 1..90)`,
  `skillLevel = clamp(mainSkillLvl, 1..7)`, `potential = clamp(potentialRank, 0..5)`.
- `skills[skillId] = clamp(specializeLevel, 0..3)` only for `unlock === 1`.
- `modules[moduleId] = clamp(level, 1..3)` only for `locked === 0`; module ids are the same
  `uniequip_*` ids the operator catalog uses.
- Inventory ids `4001` (LMD), `4002` (Originite Prime), `4003` (Orundum) are dropped from the
  item map — they are already reported as currencies and the depot UI treats them as the
  top-bar balances.
- Operator ids missing from `data/operators-index.json` are **skipped and reported**
  (`unknownOperatorIds`), item ids missing from `data/items.json` are counted
  (`unknownItemCount`). Nothing is invented for unknown ids.
- A character or inventory entry whose shape does not match the schema is skipped and counted
  in `skippedEntries`; one bad entry never fails the whole import.
- Amiya's per-skin `tmpl` variants are ignored; only the current state is imported.
- No unlock state is imported for locked skills/modules.

## 6. Feature flag

`runtimeConfig.public.yostarSyncEnabled`, default `true` (`nuxt.config.ts`). Set
`NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=false` in the deployment to:

- show a disabled notice instead of the Yostar form and disable `START SYNC`;
- make `/api/yostar/send-code` and `/api/yostar/login` answer `404`.

The flag was **not** added to `.env.example`: it is public build-time config, not a secret, and
`.env.example` is an owner-approval zone. Documented here instead.

## 7. Verification done by the agent

- Unit: mapper (7 cases), route handlers (12 cases), transport chain with a fake `fetch`
  (15 cases), composable (11 cases), stores (13 cases), modal UI (16 cases).
- No real e-mail, code or token was used. The `send-code` probe used `not-an-email`, which the
  upstream rejects before any mail is generated.

## 8. Live checklist for the owner

Only the owner can execute this — it needs a real inbox and an Arknights account.

1. `NUXT_PUBLIC_YOSTAR_SYNC_ENABLED=true`, run `npm run dev:agent`, open
   <http://localhost:3001>, header → sync button → `Yostar Email` tab.
2. Enter the e-mail linked to the Yostar account, press `SEND CODE`. Expect `CODE SENT` and an
   e-mail from Yostar within a minute.
3. Enter the 6-digit code and press `START SYNC`. Expect a green `SYNC COMPLETE` panel with the
   operator/item counts, then `/depot` shows the account's materials and balances.
4. Check the Network tab: only `/api/yostar/send-code` and `/api/yostar/login` are called; the
   response of the latter contains no `token`, `uid` or e-mail.
5. Negative case: wrong code → red `The verification code is wrong or has expired`.
6. Server logs must contain no e-mail, code or token.

If step 2 or 3 fails, record the HTTP status of the upstream request and the `Code`/`Msg` from
the Yostar response; the reason mapping in section 3 tells which code needs adding.
